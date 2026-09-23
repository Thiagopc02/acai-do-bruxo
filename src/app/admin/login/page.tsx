"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { signInWithEmailAndPassword, signOut } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";

import { auth, db } from "../../firebase/config";

export default function AdminLoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState("");

  async function fazerLoginAdmin(
    evento: React.FormEvent<HTMLFormElement>
  ) {
    evento.preventDefault();

    if (carregando) return;

    setErro("");
    setCarregando(true);

    try {
      const credencial = await signInWithEmailAndPassword(
        auth,
        email.trim().toLowerCase(),
        senha
      );

      const usuario = credencial.user;

      const adminRef = doc(db, "admins", usuario.uid);
      const adminSnap = await getDoc(adminRef);

      if (!adminSnap.exists()) {
        await signOut(auth);
        setErro("Sua conta não possui permissão administrativa.");
        return;
      }

      const adminData = adminSnap.data();

      if (adminData.role !== "admin" || adminData.ativo !== true) {
        await signOut(auth);
        setErro(
          "Seu acesso administrativo está inativo ou sem autorização."
        );
        return;
      }

      router.replace("/admin/dashboard");
    } catch (error: unknown) {
      console.error("Erro no login administrativo:", error);

      let codigo = "";

      if (
        typeof error === "object" &&
        error !== null &&
        "code" in error
      ) {
        codigo = String(error.code);
      }

      switch (codigo) {
        case "auth/invalid-email":
          setErro("O e-mail informado não é válido.");
          break;

        case "auth/invalid-credential":
        case "auth/wrong-password":
        case "auth/user-not-found":
          setErro("E-mail ou senha administrativa incorretos.");
          break;

        case "auth/too-many-requests":
          setErro(
            "Muitas tentativas de acesso. Aguarde alguns minutos e tente novamente."
          );
          break;

        case "auth/network-request-failed":
          setErro(
            "Erro de conexão. Verifique sua internet e tente novamente."
          );
          break;

        case "permission-denied":
          setErro(
            "Você não tem permissão para acessar o painel administrativo."
          );
          break;

        default:
          setErro(
            "Não foi possível acessar o painel administrativo. Tente novamente."
          );
      }
    } finally {
      setCarregando(false);
    }
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#05030a] px-4 py-10 text-white">
      {/* FUNDO */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-[-120px] top-[-80px] h-72 w-72 rounded-full bg-blue-700/20 blur-[120px]" />
        <div className="absolute right-[-120px] top-[140px] h-80 w-80 rounded-full bg-purple-700/20 blur-[140px]" />
        <div className="absolute bottom-[-120px] left-[20%] h-80 w-80 rounded-full bg-cyan-500/10 blur-[150px]" />
        <div className="absolute bottom-0 right-[10%] h-72 w-72 rounded-full bg-fuchsia-700/10 blur-[130px]" />
      </div>

      <div className="relative z-10 mx-auto flex min-h-[calc(100vh-80px)] w-full max-w-md items-center">
        <div className="w-full">
          {/* VOLTAR */}
          <Link
            href="/"
            className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-gray-400 transition hover:text-cyan-300"
          >
            ← Voltar para o site
          </Link>

          {/* CARD */}
          <div className="overflow-hidden rounded-[34px] border border-cyan-500/20 bg-gradient-to-b from-[#140a22] via-[#10071b] to-[#06060b] shadow-[0_0_60px_rgba(59,130,246,0.10)]">
            {/* HERO */}
            <div className="relative overflow-hidden border-b border-cyan-500/10 bg-gradient-to-br from-[#12071f] via-[#090611] to-[#03050b] px-4 pb-7 pt-6 sm:px-6">
              <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(59,130,246,0.18),_transparent_35%),radial-gradient(circle_at_bottom,_rgba(168,85,247,0.14),_transparent_38%)]" />

              {/* IMAGEM MAIOR */}
              <div className="relative mx-auto mb-5 flex justify-center">
                <div className="absolute top-10 h-36 w-72 rounded-full bg-cyan-500/15 blur-[70px]" />
                <div className="absolute top-14 h-32 w-72 rounded-full bg-purple-600/20 blur-[65px]" />

                <Image
                  src="/status-bruxo.png"
                  alt="Feiticeiro do Açaí do Bruxo"
                  width={1200}
                  height={600}
                  priority
                  className="relative z-10 h-auto w-[122%] max-w-none object-contain drop-shadow-[0_0_35px_rgba(59,130,246,0.20)] sm:w-[118%]"
                />
              </div>

              {/* IDENTIDADE */}
              <div className="text-center">
                <h1 className="text-[24px] font-black uppercase tracking-tight text-white sm:text-[30px]">
                  AÇAÍ DO{" "}
                  <span className="bg-gradient-to-r from-cyan-300 via-purple-400 to-blue-500 bg-clip-text text-transparent">
                    BRUXO
                  </span>
                </h1>

                <p className="mt-2 text-[10px] font-bold uppercase tracking-[4px] text-cyan-200/90">
                  Central administrativa
                </p>

                <div className="mt-5 flex justify-center">
                  <span className="inline-flex items-center gap-2 rounded-full border border-cyan-400/25 bg-cyan-400/10 px-4 py-2 text-[11px] font-bold uppercase tracking-[2px] text-cyan-200 shadow-[0_0_20px_rgba(34,211,238,0.14)]">
                    <span className="h-2 w-2 rounded-full bg-cyan-300 shadow-[0_0_10px_#67e8f9]" />
                    Acesso restrito
                  </span>
                </div>
              </div>
            </div>

            {/* CONTEÚDO */}
            <div className="px-6 py-7 sm:px-8 sm:py-8">
              <div>
                <h2 className="text-3xl font-black leading-tight text-white">
                  Bem-vindo,{" "}
                  <span className="bg-gradient-to-r from-purple-300 via-fuchsia-400 to-cyan-300 bg-clip-text text-transparent">
                    proprietário.
                  </span>
                </h2>

                <p className="mt-3 text-sm leading-7 text-gray-400">
                  Entre com suas credenciais administrativas para gerenciar
                  o universo do Açaí do Bruxo.
                </p>
              </div>

              <form
                onSubmit={fazerLoginAdmin}
                className="mt-8 space-y-5"
              >
                <div>
                  <label
                    htmlFor="email"
                    className="mb-2 block text-sm font-semibold text-gray-200"
                  >
                    E-mail administrativo
                  </label>

                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Digite seu e-mail"
                    autoComplete="email"
                    required
                    disabled={carregando}
                    className="w-full rounded-xl border border-cyan-500/20 bg-[#090611] px-4 py-4 text-sm text-white outline-none transition placeholder:text-gray-600 focus:border-cyan-400 focus:ring-2 focus:ring-cyan-500/20 disabled:cursor-not-allowed disabled:opacity-60"
                  />
                </div>

                <div>
                  <label
                    htmlFor="senha"
                    className="mb-2 block text-sm font-semibold text-gray-200"
                  >
                    Senha
                  </label>

                  <div className="relative">
                    <input
                      id="senha"
                      type={mostrarSenha ? "text" : "password"}
                      value={senha}
                      onChange={(e) => setSenha(e.target.value)}
                      placeholder="Digite sua senha"
                      autoComplete="current-password"
                      required
                      disabled={carregando}
                      className="w-full rounded-xl border border-cyan-500/20 bg-[#090611] px-4 py-4 pr-24 text-sm text-white outline-none transition placeholder:text-gray-600 focus:border-cyan-400 focus:ring-2 focus:ring-cyan-500/20 disabled:cursor-not-allowed disabled:opacity-60"
                    />

                    <button
                      type="button"
                      onClick={() => setMostrarSenha(!mostrarSenha)}
                      className="absolute inset-y-0 right-4 text-xs font-bold text-purple-300 transition hover:text-cyan-300"
                      aria-label={
                        mostrarSenha ? "Ocultar senha" : "Mostrar senha"
                      }
                    >
                      {mostrarSenha ? "Ocultar" : "Mostrar"}
                    </button>
                  </div>
                </div>

                {erro && (
                  <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm leading-6 text-red-300">
                    {erro}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={carregando}
                  className="flex w-full items-center justify-center rounded-xl bg-gradient-to-r from-blue-600 via-purple-600 to-fuchsia-500 px-6 py-4 font-bold text-white shadow-[0_0_30px_rgba(59,130,246,0.20)] transition hover:scale-[1.01] hover:from-blue-500 hover:via-purple-500 hover:to-fuchsia-400 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {carregando
                    ? "Validando acesso..."
                    : "Acessar painel administrativo →"}
                </button>
              </form>

              <div className="mt-8 rounded-2xl border border-cyan-500/15 bg-white/5 p-4">
                <div className="flex items-start gap-3">
                  <div className="mt-1 flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500/20 to-purple-500/20 text-lg">
                    🔒
                  </div>

                  <div>
                    <p className="text-sm font-bold text-cyan-200">
                      Área protegida
                    </p>
                    <p className="mt-1 text-xs leading-6 text-gray-400">
                      Acesso exclusivo para contas administrativas autorizadas
                      pelo proprietário.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* RODAPÉ */}
          <div className="mt-7 text-center">
            <p className="text-xs text-gray-600">
              © {new Date().getFullYear()} Açaí do Bruxo.
            </p>
            <p className="mt-1 text-[10px] font-bold uppercase tracking-[3px] text-blue-500/70">
              Administração exclusiva
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}