
"use client";

import Image from "next/image";
import Link from "next/link";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

import {
  signInWithEmailAndPassword,
  signOut,
} from "firebase/auth";

import {
  doc,
  getDoc,
} from "firebase/firestore";

import { auth, db } from "../firebase/config";

// ==========================================
// PÁGINA DE LOGIN
// ==========================================

export default function LoginPage() {
  const router = useRouter();

  // ==========================================
  // DADOS DO FORMULÁRIO
  // ==========================================

  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");

  // ==========================================
  // CONTROLES
  // ==========================================

  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState("");

  // ==========================================
  // REALIZAR LOGIN
  // ==========================================

  async function fazerLogin(
    evento: FormEvent<HTMLFormElement>
  ) {
    evento.preventDefault();

    if (carregando) return;

    setErro("");
    setCarregando(true);

    try {

      // 1. AUTENTICAR NO FIREBASE

      const credencial = await signInWithEmailAndPassword(
        auth,
        email.trim(),
        senha
      );

      const usuario = credencial.user;

      // ======================================
      // 2. BUSCAR O PARCEIRO NO FIRESTORE
      // ======================================

      const parceiroRef = doc(
        db,
        "parceiros",
        usuario.uid
      );

      const parceiroSnapshot = await getDoc(parceiroRef);

      // ======================================
      // 3. VERIFICAR SE O CADASTRO EXISTE
      // ======================================

      if (!parceiroSnapshot.exists()) {

        await signOut(auth);

        setErro(
          "Seu cadastro não foi localizado na nossa rede de parceiros. Entre em contato com nossa equipe."
        );

        return;
      }

      // ======================================
      // 4. VERIFICAR APROVAÇÃO
      // ======================================

      const dadosParceiro = parceiroSnapshot.data();

      if (dadosParceiro.status !== "aprovado") {

        await signOut(auth);

        setErro(
          "Seu cadastro ainda não foi aprovado. Aguarde a liberação da nossa equipe."
        );

        return;
      }

      // ======================================
      // 5. LOGIN AUTORIZADO
      // ======================================

      router.replace("/parceiros");

    } catch (error: unknown) {

      console.error("Erro ao realizar login:", error);

      let codigo = "";

      if (
        typeof error === "object" &&
        error !== null &&
        "code" in error
      ) {
        codigo = String(error.code);
      }

      // ======================================
      // TRATAMENTO DE ERROS
      // ======================================

      switch (codigo) {

        case "auth/invalid-email":

          setErro("O e-mail informado não é válido.");

          break;

        case "auth/invalid-credential":
        case "auth/wrong-password":
        case "auth/user-not-found":

          setErro("E-mail ou senha incorretos.");

          break;

        case "auth/too-many-requests":

          setErro(
            "Muitas tentativas de login. Aguarde alguns minutos e tente novamente."
          );

          break;

        case "auth/network-request-failed":

          setErro(
            "Erro de conexão. Verifique sua internet e tente novamente."
          );

          break;

        case "permission-denied":
        case "firestore/permission-denied":

          setErro(
            "Não foi possível verificar sua autorização. Entre em contato com nossa equipe."
          );

          break;

        default:

          setErro(
            "Não foi possível realizar o login. Tente novamente."
          );

      }

    } finally {

      setCarregando(false);

    }
  }

  // ==========================================
  // INTERFACE PRINCIPAL
  // ==========================================

  return (

    <>

      <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#0d0613] px-4 py-12 text-white">

        {/* =====================================
            LUZES DO FUNDO DA PÁGINA
        ===================================== */}

        <div className="pointer-events-none absolute -left-32 top-0 h-96 w-96 rounded-full bg-purple-700/20 blur-[120px]" />

        <div className="pointer-events-none absolute -right-32 bottom-0 h-96 w-96 rounded-full bg-fuchsia-700/20 blur-[120px]" />

        <div className="relative z-10 w-full max-w-md">

          {/* =====================================
              VOLTAR AO SITE
          ===================================== */}

          <Link
            href="/"
            className="mb-7 inline-flex items-center gap-2 text-sm font-medium text-gray-400 transition hover:text-purple-300"
          >

            ← Voltar para o site

          </Link>

          {/* =====================================
              CARD PRINCIPAL
          ===================================== */}

          <div className="overflow-hidden rounded-[32px] border border-purple-500/25 bg-[#1a0c29] p-6 shadow-2xl shadow-purple-950/40 sm:p-9">

            {/* =====================================
                IMAGEM DO MAGO
            ===================================== */}

            <div className="relative mx-auto flex h-44 items-center justify-center">

              <div className="absolute h-32 w-32 rounded-full bg-purple-600/30 blur-[55px]" />

              <Image
                src="/mago.png"
                alt="Mago do Açaí do Bruxo"
                width={180}
                height={220}
                priority
                className="relative h-40 w-auto object-contain drop-shadow-[0_0_30px_rgba(168,85,247,0.5)]"
              />

            </div>

            {/* =====================================
                IDENTIDADE VISUAL
            ===================================== */}

            <div className="mt-4 text-center">

              <h1 className="text-2xl font-black tracking-tight">

                AÇAÍ DO{" "}

                <span className="text-purple-400">

                  BRUXO

                </span>

              </h1>

              <p className="mt-2 text-[10px] font-bold uppercase tracking-[3px] text-purple-300">

                Portal exclusivo de parceiros

              </p>

            </div>

            {/* =====================================
                APRESENTAÇÃO
            ===================================== */}

            <div className="mt-10">

              <h2 className="text-2xl font-black">

                Bem-vindo de volta!

              </h2>

              <p className="mt-2 text-sm leading-6 text-gray-400">

                Entre com suas credenciais para acessar
                seu espaço exclusivo e realizar pedidos.

              </p>

            </div>

            {/* =====================================
                FORMULÁRIO DE LOGIN
            ===================================== */}

            <form
              onSubmit={fazerLogin}
              className="mt-8 space-y-5"
            >

              {/* =====================================
                  E-MAIL
              ===================================== */}

              <div>

                <label
                  htmlFor="email"
                  className="mb-2 block text-sm font-semibold text-gray-300"
                >

                  E-mail

                </label>

                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="seuemail@exemplo.com"
                  autoComplete="email"
                  required
                  disabled={carregando}
                  className="w-full rounded-xl border border-purple-500/20 bg-[#100719] px-4 py-4 text-sm text-white outline-none transition placeholder:text-gray-600 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 disabled:opacity-60"
                />

              </div>

              {/* =====================================
                  SENHA
              ===================================== */}

              <div>

                <label
                  htmlFor="senha"
                  className="mb-2 block text-sm font-semibold text-gray-300"
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
                    className="w-full rounded-xl border border-purple-500/20 bg-[#100719] px-4 py-4 pr-20 text-sm text-white outline-none transition placeholder:text-gray-600 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 disabled:opacity-60"
                  />

                  {/* MOSTRAR / OCULTAR */}

                  <button
                    type="button"
                    onClick={() => setMostrarSenha(!mostrarSenha)}
                    className="absolute inset-y-0 right-4 text-xs font-semibold text-purple-400 transition hover:text-purple-300"
                    aria-label={
                      mostrarSenha
                        ? "Ocultar senha"
                        : "Mostrar senha"
                    }
                  >

                    {mostrarSenha ? "Ocultar" : "Mostrar"}

                  </button>

                </div>

              </div>

              {/* =====================================
                  MENSAGEM DE ERRO
              ===================================== */}

              {erro && (

                <div
                  role="alert"
                  className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm leading-6 text-red-300"
                >

                  {erro}

                </div>

              )}

              {/* =====================================
                  BOTÃO ENTRAR
              ===================================== */}

              <button
                type="submit"
                disabled={carregando}
                className="flex w-full items-center justify-center rounded-xl bg-purple-600 px-6 py-4 font-bold text-white shadow-lg shadow-purple-950/40 transition hover:bg-purple-500 disabled:cursor-not-allowed disabled:opacity-60"
              >

                {carregando
                  ? "Verificando seu acesso..."
                  : "Entrar no portal →"}

              </button>

            </form>

            {/* =====================================
                ÁREA DE CADASTRO
            ===================================== */}

            <div className="mt-8 border-t border-purple-500/20 pt-7">

              <p className="text-center text-sm text-gray-400">

                Ainda não é parceiro do Bruxo?

              </p>

              {/* =====================================
                  BOTÃO CADASTRE-SE
                  COM RAIOS VERDES NAS BORDAS
              ===================================== */}

              <Link
                href="/cadastro"
                aria-label="Cadastre-se"
                className="cadastro-raio group relative mt-5 flex min-h-[112px] w-full items-center justify-center overflow-hidden rounded-[22px] bg-[#1a0c29] transition-transform duration-300 hover:-translate-y-[2px] active:scale-[0.97] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#7cff4b]"
              >

                {/* =====================================
                    BORDA FIXA VERDE DISCRETA
                ===================================== */}

                <div className="pointer-events-none absolute inset-0 rounded-[22px] border border-[#65ff32]/35" />

                {/* =====================================
                    RAIOS ELÉTRICOS NA BORDA

                    O SVG SEGUE O FORMATO EXATO
                    DO RETÂNGULO ARREDONDADO.
                ===================================== */}

                <svg
                  className="raios-svg pointer-events-none absolute inset-0 h-full w-full overflow-visible"
                  viewBox="0 0 320 112"
                  preserveAspectRatio="none"
                  aria-hidden="true"
                >

                  <defs>

                    {/* BRILHO ELÉTRICO */}

                    <filter
                      id="brilho-eletrico-cadastro"
                      x="-50%"
                      y="-50%"
                      width="200%"
                      height="200%"
                    >

                      <feGaussianBlur
                        stdDeviation="2.5"
                        result="blur"
                      />

                      <feMerge>

                        <feMergeNode in="blur" />

                        <feMergeNode in="SourceGraphic" />

                      </feMerge>

                    </filter>

                  </defs>

                  {/* CAMADA DE LUZ */}

                  <rect
                    className="raio-trilha raio-brilho"
                    x="1.5"
                    y="1.5"
                    width="317"
                    height="109"
                    rx="20"
                    ry="20"
                    fill="none"
                    stroke="#65ff32"
                    strokeWidth="3"
                    strokeDasharray="30 18 4 14 52 20 3 12"
                    vectorEffect="non-scaling-stroke"
                    filter="url(#brilho-eletrico-cadastro)"
                  />

                  {/* NÚCLEO BRANCO-ESVERDEADO */}

                  <rect
                    className="raio-trilha"
                    x="1.5"
                    y="1.5"
                    width="317"
                    height="109"
                    rx="20"
                    ry="20"
                    fill="none"
                    stroke="#dfffad"
                    strokeWidth="1.2"
                    strokeDasharray="30 18 4 14 52 20 3 12"
                    vectorEffect="non-scaling-stroke"
                  />

                </svg>

                {/* =====================================
                    LUZ VERDE PEQUENA ATRÁS DAS LETRAS

                    FICA PARADA NO ESTADO NORMAL.
                    AUMENTA SOMENTE NA INTERAÇÃO.
                ===================================== */}

                <div className="luz-cadastro pointer-events-none absolute left-1/2 top-1/2 h-[28px] w-[115px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#65ff32]/25 blur-[20px] transition-all duration-500 group-hover:h-[55px] group-hover:w-[220px] group-hover:bg-[#65ff32]/55 group-hover:blur-[30px] group-active:h-[65px] group-active:w-[250px] group-active:bg-[#65ff32]/75 group-focus-visible:h-[55px] group-focus-visible:w-[220px] group-focus-visible:bg-[#65ff32]/55" />

                {/* =====================================
                    IMAGEM CADASTRE-SE
                ===================================== */}

                <Image
                  src="/cadastrese.png"
                  alt=""
                  width={2172}
                  height={724}
                  sizes="(max-width: 640px) 80vw, 330px"
                  className="relative z-10 h-auto w-full max-w-[275px] object-contain transition-all duration-300 group-hover:scale-[1.05] group-active:scale-[1.08] group-active:drop-shadow-[0_0_15px_rgba(100,255,40,0.7)]"
                />

              </Link>

              {/* =====================================
                  INFORMAÇÃO SOBRE CADASTRO
              ===================================== */}

              <p className="mt-4 text-center text-xs leading-6 text-gray-500">

                Cadastre seu estabelecimento e aguarde
                a aprovação da nossa equipe.

              </p>

            </div>

          </div>

          {/* =====================================
              RODAPÉ
          ===================================== */}

          <p className="mt-7 text-center text-xs text-gray-600">

            © {new Date().getFullYear()} Açaí do Bruxo.
            Todos os direitos reservados.

          </p>

        </div>

      </main>

      {/* =====================================
          ESTILOS E ANIMAÇÕES
      ===================================== */}

      <style jsx>{`

        /* =====================================
           RAIOS ELÉTRICOS

           APENAS A BORDA SE MOVIMENTA.
           O FUNDO PERMANECE ROXO.
        ===================================== */

        .raio-trilha {
          animation: percorrerBorda 6s linear infinite;

          transition:
            stroke-width 0.3s ease,
            opacity 0.3s ease;
        }

        /* BRILHO NORMAL */

        .raio-brilho {
          opacity: 0.65;
        }

        /* =====================================
           MOUSE SOBRE O BOTÃO
        ===================================== */

        .cadastro-raio:hover .raio-trilha,
        .cadastro-raio:focus-visible .raio-trilha {
          animation-duration: 2.5s;
          stroke-width: 2.5;
        }

        .cadastro-raio:hover .raio-brilho,
        .cadastro-raio:focus-visible .raio-brilho {
          opacity: 1;
        }

        /* =====================================
           TOQUE NO CELULAR
        ===================================== */

        .cadastro-raio:active .raio-trilha {
          animation-duration: 1s;
          stroke-width: 3;
        }

        .cadastro-raio:active .raio-brilho {
          opacity: 1;
        }

        /* =====================================
           RAIOS PERCORRENDO O PERÍMETRO
        ===================================== */

        @keyframes percorrerBorda {

          from {
            stroke-dashoffset: 0;
          }

          to {
            stroke-dashoffset: -306;
          }

        }

        /* =====================================
           REDUÇÃO DE MOVIMENTO
        ===================================== */

        @media (prefers-reduced-motion: reduce) {

          .raio-trilha {
            animation: none;
          }

        }

      `}</style>

    </>

  );
}