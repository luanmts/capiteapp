"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { motion } from "framer-motion";
import {
  X, Mail, ArrowRight, ArrowLeft,
  Check, Eye, EyeOff, Loader2, ShieldAlert, PartyPopper, Lock,
} from "lucide-react";
import clsx from "clsx";

type Step = "email" | "code" | "register" | "done" | "password" | "login-done";
type CodeState = "idle" | "checking" | "success" | "error";

// Mock existing users
const EXISTING_USERS: Record<string, { nome: string; senha: string }> = {
  "teste123@gmail.com": { nome: "Usuário Teste", senha: "teste123" },
};

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLogin?: (user: { nome: string; email: string }) => void;
}

export default function AuthModal({ isOpen, onClose, onLogin }: AuthModalProps) {
  const [visible, setVisible]         = useState(false);
  const [step, setStep]               = useState<Step>("email");
  const [email, setEmail]             = useState("");
  const [registeredNome, setRegisteredNome] = useState("");
  const [emailLoading, setEmailLoading] = useState(false);
  const [codeState, setCodeState]     = useState<CodeState>("idle");
  const inputRef = useRef<HTMLInputElement>(null);

  // Animate in
  useEffect(() => {
    if (isOpen) {
      requestAnimationFrame(() => requestAnimationFrame(() => setVisible(true)));
    } else {
      setVisible(false);
    }
  }, [isOpen]);

  // ESC to close
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [isOpen, onClose]);

  // Auto-focus email input
  useEffect(() => {
    if (visible && step === "email" && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [visible, step]);

  // Reset state after modal closes
  useEffect(() => {
    if (!isOpen) {
      const t = setTimeout(() => {
        setStep("email");
        setEmail("");
        setRegisteredNome("");
        setEmailLoading(false);
        setCodeState("idle");
      }, 350);
      return () => clearTimeout(t);
    }
  }, [isOpen]);

  const handleEmailSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || emailLoading) return;
    setEmailLoading(true);
    setTimeout(() => {
      setEmailLoading(false);
      if (EXISTING_USERS[email.toLowerCase()]) {
        setStep("password");
      } else {
        setStep("code");
      }
    }, 1500);
  };

  const handleCodeSuccess = useCallback(() => {
    setTimeout(() => setStep("register"), 900);
  }, []);

  const handleRegisterSuccess = useCallback((nome: string) => {
    setRegisteredNome(nome);
    setStep("done");
    onLogin?.({ nome, email });
  }, [email, onLogin]);

  const handlePasswordSuccess = useCallback((nome: string) => {
    setRegisteredNome(nome);
    setStep("login-done");
    onLogin?.({ nome, email });
  }, [email, onLogin]);

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) onClose();
  };

  if (!isOpen) return null;

  const content = (
    <ModalContent
      step={step}
      email={email}
      setEmail={setEmail}
      inputRef={inputRef}
      onClose={onClose}
      emailLoading={emailLoading}
      onEmailSubmit={handleEmailSubmit}
      onBack={() => setStep("email")}
      codeState={codeState}
      setCodeState={setCodeState}
      onCodeSuccess={handleCodeSuccess}
      onRegisterSuccess={handleRegisterSuccess}
      onPasswordSuccess={handlePasswordSuccess}
      registeredNome={registeredNome}
    />
  );

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={handleBackdropClick}
        className={clsx(
          "fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm transition-opacity duration-300",
          visible ? "opacity-100" : "opacity-0"
        )}
      />

      {/* Desktop modal */}
      <div className="fixed inset-0 z-[61] hidden lg:flex items-center justify-center pointer-events-none">
        <div className={clsx(
          "pointer-events-auto bg-card border border-white/[0.08] rounded-2xl shadow-2xl w-full max-w-md mx-4 p-8 transition-all duration-300",
          visible ? "opacity-100 scale-100 translate-y-0" : "opacity-0 scale-95 translate-y-2"
        )}>
          {content}
        </div>
      </div>

      {/* Mobile bottom sheet */}
      <div className={clsx(
        "fixed inset-x-0 bottom-0 z-[61] lg:hidden transition-transform duration-300 ease-out",
        visible ? "translate-y-0" : "translate-y-full"
      )}>
        <div className="flex justify-center pt-3 pb-0 bg-card rounded-t-3xl border-t border-x border-white/[0.08]">
          <div className="w-10 h-1 rounded-full bg-white/20" />
        </div>
        <div className="bg-card border-x border-white/[0.08] px-6 pb-10 pt-4">
          {content}
        </div>
      </div>
    </>
  );
}

// ── Router ─────────────────────────────────────────────────────────────────────
interface ContentProps {
  step: Step;
  email: string;
  setEmail: (v: string) => void;
  inputRef: React.RefObject<HTMLInputElement>;
  onClose: () => void;
  emailLoading: boolean;
  onEmailSubmit: (e: React.FormEvent) => void;
  onBack: () => void;
  codeState: CodeState;
  setCodeState: (s: CodeState) => void;
  onCodeSuccess: () => void;
  onRegisterSuccess: (nome: string) => void;
  onPasswordSuccess: (nome: string) => void;
  registeredNome: string;
}

function ModalContent(props: ContentProps) {
  if (props.step === "code") {
    return (
      <CodeStep
        email={props.email}
        codeState={props.codeState}
        setCodeState={props.setCodeState}
        onSuccess={props.onCodeSuccess}
        onBack={props.onBack}
        onClose={props.onClose}
      />
    );
  }
  if (props.step === "register") {
    return <RegisterStep onSuccess={props.onRegisterSuccess} email={props.email} />;
  }
  if (props.step === "done") {
    return <SuccessStep nome={props.registeredNome} onClose={props.onClose} />;
  }
  if (props.step === "password") {
    return (
      <PasswordStep
        email={props.email}
        onSuccess={props.onPasswordSuccess}
        onBack={props.onBack}
        onClose={props.onClose}
      />
    );
  }
  if (props.step === "login-done") {
    return <LoginDoneStep nome={props.registeredNome} onClose={props.onClose} />;
  }
  return (
    <EmailStep
      email={props.email}
      setEmail={props.setEmail}
      inputRef={props.inputRef}
      loading={props.emailLoading}
      onSubmit={props.onEmailSubmit}
      onClose={props.onClose}
    />
  );
}

// ── Step 0: Email ──────────────────────────────────────────────────────────────
function EmailStep({
  email, setEmail, inputRef, loading, onSubmit, onClose,
}: {
  email: string;
  setEmail: (v: string) => void;
  inputRef: React.RefObject<HTMLInputElement>;
  loading: boolean;
  onSubmit: (e: React.FormEvent) => void;
  onClose: () => void;
}) {
  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-xl font-bold text-white">Bem-vindo ao Previsão.io</h2>
          <p className="text-sm text-text-tint mt-1">Faça login ou crie sua conta para continuar</p>
        </div>
        <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/5 text-text-tint hover:text-white transition-colors shrink-0 -mt-0.5 -mr-1">
          <X className="w-4 h-4" />
        </button>
      </div>

      <button className="w-full flex items-center justify-center gap-3 bg-white hover:bg-white/90 text-gray-900 font-semibold text-sm px-4 py-3 rounded-xl transition-colors">
        <GoogleIcon />
        Continuar com o Google
      </button>

      <div className="flex items-center gap-3">
        <div className="flex-1 h-px bg-white/[0.08]" />
        <span className="text-xs text-text-tint font-medium uppercase tracking-widest">ou</span>
        <div className="flex-1 h-px bg-white/[0.08]" />
      </div>

      <form onSubmit={onSubmit} className="space-y-3">
        <div className="relative">
          <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-text-tint pointer-events-none" />
          <input
            ref={inputRef}
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Seu e-mail"
            required
            disabled={loading}
            className="w-full bg-gray-medium/60 border border-white/[0.08] rounded-xl pl-10 pr-4 py-3 text-sm text-white placeholder-text-tint focus:outline-none focus:border-primary/50 focus:bg-gray-medium/80 transition-all disabled:opacity-60"
          />
        </div>

        <button
          type="submit"
          disabled={!email || loading}
          className={clsx(
            "w-full flex items-center justify-center gap-2 font-semibold text-sm px-4 py-3 rounded-xl transition-all",
            email && !loading
              ? "bg-primary hover:bg-primary/90 text-white"
              : "bg-white/[0.06] text-text-tint cursor-not-allowed"
          )}
        >
          {loading ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <>Continuar <ArrowRight className="w-4 h-4" /></>
          )}
        </button>
      </form>

      <p className="text-[11px] text-text-tint/60 text-center leading-relaxed">
        Ao continuar, você concorda com nossos{" "}
        <button className="underline underline-offset-2 hover:text-text-tint transition-colors">Termos de Uso</button>{" "}
        e{" "}
        <button className="underline underline-offset-2 hover:text-text-tint transition-colors">Política de Privacidade</button>.
      </p>
    </div>
  );
}

// ── Step 1: Code verification ──────────────────────────────────────────────────
const CORRECT_CODE = "111111";

function CodeStep({
  email, codeState, setCodeState, onSuccess, onBack, onClose,
}: {
  email: string;
  codeState: CodeState;
  setCodeState: (s: CodeState) => void;
  onSuccess: () => void;
  onBack: () => void;
  onClose: () => void;
}) {
  const [digits, setDigits] = useState<string[]>(Array(6).fill(""));
  const refs = useRef<(HTMLInputElement | null)[]>(Array(6).fill(null));

  const validate = useCallback((code: string) => {
    setCodeState("checking");
    setTimeout(() => {
      if (code === CORRECT_CODE) {
        setCodeState("success");
        onSuccess();
      } else {
        setCodeState("error");
        setTimeout(() => {
          setCodeState("idle");
          setDigits(Array(6).fill(""));
          refs.current[0]?.focus();
        }, 2000);
      }
    }, 1300);
  }, [setCodeState, onSuccess]);

  const handleChange = (i: number, val: string) => {
    if (!/^\d*$/.test(val) || codeState === "checking" || codeState === "success") return;
    const next = [...digits];
    next[i] = val.slice(-1);
    setDigits(next);
    if (val && i < 5) refs.current[i + 1]?.focus();
    if (val && next.every((d) => d !== "")) validate(next.join(""));
  };

  const handleKeyDown = (i: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !digits[i] && i > 0) {
      refs.current[i - 1]?.focus();
    }
    if (e.key === "ArrowLeft" && i > 0) refs.current[i - 1]?.focus();
    if (e.key === "ArrowRight" && i < 5) refs.current[i + 1]?.focus();
  };

  // Handle paste
  const handlePaste = (e: React.ClipboardEvent) => {
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (!pasted) return;
    e.preventDefault();
    const next = Array(6).fill("").map((_, i) => pasted[i] ?? "");
    setDigits(next);
    refs.current[Math.min(pasted.length, 5)]?.focus();
    if (pasted.length === 6) validate(pasted);
  };

  const isError   = codeState === "error";
  const isSuccess = codeState === "success";
  const isChecking = codeState === "checking";
  const disabled  = isChecking || isSuccess;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <button onClick={onBack} className="p-1.5 rounded-lg hover:bg-white/5 text-text-tint hover:text-white transition-colors -ml-1">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/5 text-text-tint hover:text-white transition-colors -mr-1">
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="space-y-1">
        <h2 className="text-xl font-bold text-white">Insira o código</h2>
        <p className="text-sm text-text-tint">
          Enviamos um código de verificação para{" "}
          <span className="text-white font-medium">{email}</span>
        </p>
      </div>

      {/* Boxes OR status — same fixed-height slot */}
      <div className="flex justify-center items-center" style={{ minHeight: 56 }}>
        {!isChecking && !isSuccess && !isError ? (
          /* 6-digit boxes */
          <div className="flex gap-2.5">
            {digits.map((d, i) => (
              <input
                key={i}
                ref={(el) => { refs.current[i] = el; }}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={d}
                onChange={(e) => handleChange(i, e.target.value)}
                onKeyDown={(e) => handleKeyDown(i, e)}
                onPaste={handlePaste}
                disabled={disabled}
                className={clsx(
                  "w-11 h-14 rounded-xl text-center text-xl font-bold text-white border-2 bg-white/[0.05] transition-all focus:outline-none",
                  d ? "border-white/30" : "border-white/10 focus:border-primary/50"
                )}
              />
            ))}
          </div>
        ) : isChecking ? (
          <Loader2 className="w-8 h-8 text-primary animate-spin" />
        ) : isSuccess ? (
          <div className="flex flex-col items-center gap-2 text-primary">
            <span className="flex items-center justify-center w-12 h-12 rounded-full bg-primary/15">
              <Check className="w-6 h-6" />
            </span>
            <span className="text-sm font-semibold">Código verificado!</span>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2 text-red-400">
            <span className="flex items-center justify-center w-12 h-12 rounded-full bg-red-500/15">
              <X className="w-6 h-6" />
            </span>
            <span className="text-sm font-semibold">Código incorreto. Tente novamente.</span>
          </div>
        )}
      </div>

      {/* Security warning — right below the boxes area */}
      <div className="flex gap-3 bg-yellow-500/5 border border-yellow-500/15 rounded-xl p-3.5">
        <ShieldAlert className="w-4 h-4 text-yellow-400/70 shrink-0 mt-0.5" />
        <p className="text-[11px] text-text-tint/70 leading-relaxed">
          Os funcionários do <span className="font-semibold text-text-tint">Previsão.io</span> NUNCA fornecerão um código para você acessar o site. Se alguém lhe der um código, trata-se de uma tentativa de phishing e deve ser denunciada.
        </p>
      </div>
    </div>
  );
}

// ── Step 2: Register ───────────────────────────────────────────────────────────
function RegisterStep({ onSuccess, email }: { onSuccess: (nome: string) => void; email: string }) {
  const [nome, setNome]               = useState("");
  const [cpf, setCpf]                 = useState("");
  const [senha, setSenha]             = useState("");
  const [confirmar, setConfirmar]     = useState("");
  const [showSenha, setShowSenha]     = useState(false);
  const [showConfirmar, setShowConfirmar] = useState(false);
  const [loading, setLoading]         = useState(false);

  const formatCpf = (v: string) => {
    const n = v.replace(/\D/g, "").slice(0, 11);
    return n
      .replace(/(\d{3})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d{1,2})$/, "$1-$2");
  };

  const senhaMatch = senha === confirmar || confirmar === "";
  const canSubmit  = nome.trim() && cpf.replace(/\D/g, "").length === 11 && senha.length >= 6 && senha === confirmar && !loading;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      onSuccess(nome.trim());
    }, 1500);
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex-1 pr-4">
          <h2 className="text-xl font-bold text-white">Falta pouco!</h2>
          <p className="text-sm text-text-tint mt-0.5">Crie sua conta em segundos</p>
        </div>
      </div>

      {/* Email badge */}
      <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/[0.04] border border-white/[0.06]">
        <Mail className="w-3.5 h-3.5 text-text-tint shrink-0" />
        <span className="text-xs text-text-tint truncate">{email}</span>
      </div>

      <form onSubmit={handleSubmit} className="space-y-3">
        {/* Nome */}
        <div>
          <input
            type="text"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            placeholder="Nome completo"
            required
            autoComplete="name"
            className="w-full bg-gray-medium/60 border border-white/[0.08] rounded-xl px-4 py-3 text-sm text-white placeholder-text-tint focus:outline-none focus:border-primary/50 transition-all"
          />
        </div>

        {/* CPF */}
        <div>
          <input
            type="text"
            value={cpf}
            onChange={(e) => setCpf(formatCpf(e.target.value))}
            placeholder="CPF (000.000.000-00)"
            required
            inputMode="numeric"
            className="w-full bg-gray-medium/60 border border-white/[0.08] rounded-xl px-4 py-3 text-sm text-white placeholder-text-tint focus:outline-none focus:border-primary/50 transition-all"
          />
        </div>

        {/* Senha */}
        <div className="relative">
          <input
            type={showSenha ? "text" : "password"}
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
            placeholder="Senha (mínimo 6 caracteres)"
            required
            minLength={6}
            autoComplete="new-password"
            className="w-full bg-gray-medium/60 border border-white/[0.08] rounded-xl pl-4 pr-10 py-3 text-sm text-white placeholder-text-tint focus:outline-none focus:border-primary/50 transition-all"
          />
          <button
            type="button"
            onClick={() => setShowSenha((v) => !v)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-text-tint hover:text-white transition-colors"
          >
            {showSenha ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>

        {/* Confirmar senha */}
        <div className="relative">
          <input
            type={showConfirmar ? "text" : "password"}
            value={confirmar}
            onChange={(e) => setConfirmar(e.target.value)}
            placeholder="Confirmar senha"
            required
            autoComplete="new-password"
            className={clsx(
              "w-full bg-gray-medium/60 border rounded-xl pl-4 pr-10 py-3 text-sm text-white placeholder-text-tint focus:outline-none transition-all",
              !senhaMatch
                ? "border-red-500/50 focus:border-red-500/70"
                : "border-white/[0.08] focus:border-primary/50"
            )}
          />
          <button
            type="button"
            onClick={() => setShowConfirmar((v) => !v)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-text-tint hover:text-white transition-colors"
          >
            {showConfirmar ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
        {!senhaMatch && confirmar && (
          <p className="text-xs text-red-400 -mt-1 pl-1">As senhas não coincidem.</p>
        )}

        {/* Submit */}
        <button
          type="submit"
          disabled={!canSubmit}
          className={clsx(
            "w-full flex items-center justify-center gap-2 font-semibold text-sm px-4 py-3 rounded-xl transition-all mt-1",
            canSubmit
              ? "bg-primary hover:bg-primary/90 text-white"
              : "bg-white/[0.06] text-text-tint cursor-not-allowed"
          )}
        >
          {loading ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <>Criar conta <ArrowRight className="w-4 h-4" /></>
          )}
        </button>
      </form>
    </div>
  );
}

// ── Step 3: Success ─────────────────────────────────────────────────────────────
function SuccessStep({ nome, onClose }: { nome: string; onClose: () => void }) {
  const firstName = nome.split(" ")[0];

  const fadeUp = (delay: number) => ({
    initial: { opacity: 0, y: 16 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.45, ease: [0.22, 1, 0.36, 1], delay },
  });

  return (
    <div className="flex flex-col items-center text-center space-y-6 py-4">
      {/* Icon — pop in with spring */}
      <motion.div
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", damping: 14, stiffness: 260, delay: 0.05 }}
        className="flex items-center justify-center w-20 h-20 rounded-full bg-primary/15"
      >
        <motion.div
          initial={{ rotate: -20 }}
          animate={{ rotate: 0 }}
          transition={{ type: "spring", damping: 12, stiffness: 200, delay: 0.15 }}
        >
          <PartyPopper className="w-9 h-9 text-primary" />
        </motion.div>
      </motion.div>

      {/* Text */}
      <motion.div {...fadeUp(0.18)} className="space-y-1.5">
        <h2 className="text-2xl font-bold text-white">Conta criada!</h2>
        <p className="text-sm text-text-tint leading-relaxed">
          Bem-vindo ao <span className="text-white font-semibold">Previsão.io</span>
          {firstName ? `, ${firstName}` : ""}! <br />
          Sua conta foi criada com sucesso.
        </p>
      </motion.div>

      {/* CTA */}
      <motion.button
        {...fadeUp(0.30)}
        onClick={onClose}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.97 }}
        className="w-full flex items-center justify-center gap-2 bg-primary hover:bg-primary/90 text-white font-semibold text-sm px-4 py-3 rounded-xl transition-colors"
      >
        Começar a explorar <ArrowRight className="w-4 h-4" />
      </motion.button>
    </div>
  );
}

// ── Step: Password (login) ─────────────────────────────────────────────────────
function PasswordStep({
  email, onSuccess, onBack, onClose,
}: {
  email: string;
  onSuccess: (nome: string) => void;
  onBack: () => void;
  onClose: () => void;
}) {
  const [senha, setSenha]     = useState("");
  const [show, setShow]       = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!senha || loading) return;
    setLoading(true);
    setError(false);
    setTimeout(() => {
      const user = EXISTING_USERS[email.toLowerCase()];
      if (user && senha === user.senha) {
        onSuccess(user.nome);
      } else {
        setLoading(false);
        setError(true);
        setTimeout(() => setError(false), 3000);
      }
    }, 1300);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <button onClick={onBack} className="p-1.5 rounded-lg hover:bg-white/5 text-text-tint hover:text-white transition-colors -ml-1">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/5 text-text-tint hover:text-white transition-colors -mr-1">
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="space-y-1">
        <h2 className="text-xl font-bold text-white">Bem-vindo de volta!</h2>
        <p className="text-sm text-text-tint">Digite sua senha para entrar</p>
      </div>

      {/* Email badge */}
      <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/[0.04] border border-white/[0.06]">
        <Mail className="w-3.5 h-3.5 text-text-tint shrink-0" />
        <span className="text-xs text-text-tint truncate">{email}</span>
      </div>

      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="relative">
          <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-text-tint pointer-events-none" />
          <input
            type={show ? "text" : "password"}
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
            placeholder="Sua senha"
            required
            autoFocus
            autoComplete="current-password"
            disabled={loading}
            className={clsx(
              "w-full bg-gray-medium/60 border rounded-xl pl-10 pr-10 py-3 text-sm text-white placeholder-text-tint focus:outline-none transition-all disabled:opacity-60",
              error
                ? "border-red-500/50 focus:border-red-500/70"
                : "border-white/[0.08] focus:border-primary/50"
            )}
          />
          <button
            type="button"
            onClick={() => setShow((v) => !v)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-text-tint hover:text-white transition-colors"
          >
            {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>

        {error && (
          <p className="text-xs text-red-400 pl-1">Senha incorreta. Tente novamente.</p>
        )}

        <button
          type="submit"
          disabled={!senha || loading}
          className={clsx(
            "w-full flex items-center justify-center gap-2 font-semibold text-sm px-4 py-3 rounded-xl transition-all",
            senha && !loading
              ? "bg-primary hover:bg-primary/90 text-white"
              : "bg-white/[0.06] text-text-tint cursor-not-allowed"
          )}
        >
          {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <>Entrar <ArrowRight className="w-4 h-4" /></>}
        </button>
      </form>
    </div>
  );
}

// ── Step: Login success ────────────────────────────────────────────────────────
function LoginDoneStep({ nome, onClose }: { nome: string; onClose: () => void }) {
  const firstName = nome.split(" ")[0];

  const fadeUp = (delay: number) => ({
    initial: { opacity: 0, y: 16 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.45, ease: [0.22, 1, 0.36, 1], delay },
  });

  return (
    <div className="flex flex-col items-center text-center space-y-6 py-4">
      <motion.div
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", damping: 14, stiffness: 260, delay: 0.05 }}
        className="flex items-center justify-center w-20 h-20 rounded-full bg-primary/15"
      >
        <motion.div
          initial={{ scale: 0.6 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", damping: 12, stiffness: 200, delay: 0.15 }}
        >
          <Check className="w-9 h-9 text-primary" />
        </motion.div>
      </motion.div>

      <motion.div {...fadeUp(0.18)} className="space-y-1.5">
        <h2 className="text-2xl font-bold text-white">Olá, {firstName}!</h2>
        <p className="text-sm text-text-tint leading-relaxed">
          Login realizado com sucesso.<br />
          Boas previsões no <span className="text-white font-semibold">Previsão.io</span>!
        </p>
      </motion.div>

      <motion.button
        {...fadeUp(0.30)}
        onClick={onClose}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.97 }}
        className="w-full flex items-center justify-center gap-2 bg-primary hover:bg-primary/90 text-white font-semibold text-sm px-4 py-3 rounded-xl transition-colors"
      >
        Começar a explorar <ArrowRight className="w-4 h-4" />
      </motion.button>
    </div>
  );
}

// ── Google icon ────────────────────────────────────────────────────────────────
function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M17.64 9.20455C17.64 8.56637 17.5827 7.95273 17.4764 7.36364H9V10.845H13.8436C13.635 11.97 13.0009 12.9232 12.0477 13.5614V15.8196H14.9564C16.6582 14.2527 17.64 11.9455 17.64 9.20455Z" fill="#4285F4"/>
      <path d="M9 18C11.43 18 13.4673 17.1941 14.9564 15.8195L12.0477 13.5614C11.2418 14.1014 10.2109 14.4204 9 14.4204C6.65591 14.4204 4.67182 12.8373 3.96409 10.71H0.957275V13.0418C2.43818 15.9832 5.48182 18 9 18Z" fill="#34A853"/>
      <path d="M3.96409 10.71C3.78409 10.17 3.68182 9.59318 3.68182 9C3.68182 8.40682 3.78409 7.83 3.96409 7.29V4.95818H0.957275C0.347727 6.17318 0 7.54773 0 9C0 10.4523 0.347727 11.8268 0.957275 13.0418L3.96409 10.71Z" fill="#FBBC05"/>
      <path d="M9 3.57955C10.3214 3.57955 11.5077 4.03364 12.4405 4.92545L15.0218 2.34409C13.4632 0.891818 11.4259 0 9 0C5.48182 0 2.43818 2.01682 0.957275 4.95818L3.96409 7.29C4.67182 5.16273 6.65591 3.57955 9 3.57955Z" fill="#EA4335"/>
    </svg>
  );
}
