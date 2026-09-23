
"use client";

import Image from "next/image";
import Link from "next/link";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import {
  onAuthStateChanged,
  signOut,
  type User,
} from "firebase/auth";

import {
  doc,
  onSnapshot,
} from "firebase/firestore";

import { auth, db } from "../firebase/config";

// ==========================================
// TIPOS
// ==========================================

type StatusParceiro =
  | "pendente"
  | "aprovado"
  | "rejeitado";

type Parceiro = {
  nome: string;
  empresa: string;
  email: string;
  status: StatusParceiro;
};

// ==========================================
// PÁGINA DE STATUS
// ==========================================

export default function StatusPage() {
  const router = useRouter();

  const [usuario, setUsuario] = useState<User | null>(null);

  const [parceiro, setParceiro] =
    useState<Parceiro | null>(null);

  const [carregando, setCarregando] = useState(true);

  const [erro, setErro] = useState("");

  // ==========================================
  // VERIFICAR AUTENTICAÇÃO E STATUS
  // ==========================================

  useEffect(() => {
    let cancelarConsulta: (() => void) | undefined;

    const cancelarAuth = onAuthStateChanged(
      auth,

      (usuarioAtual) => {
        cancelarConsulta?.();
        cancelarConsulta = undefined;

        if (!usuarioAtual) {
          setUsuario(null);
          setParceiro(null);
          router.replace("/login");
          return;
        }

        setUsuario(usuarioAtual);
        setCarregando(true);
        setErro("");

        // CONSULTAR O DOCUMENTO DO PARCEIRO

        const parceiroRef = doc(
          db,
          "parceiros",
          usuarioAtual.uid
        );

        // ATUALIZAÇÃO EM TEMPO REAL

        cancelarConsulta = onSnapshot(
          parceiroRef,

          (snapshot) => {
            if (!snapshot.exists()) {
              setParceiro(null);

              setErro(
                "Não encontramos sua solicitação. Entre em contato com nossa equipe."
              );

              setCarregando(false);
              return;
            }

            const dados = snapshot.data();

            const status = dados.status;

            if (
              status !== "pendente" &&
              status !== "aprovado" &&
              status !== "rejeitado"
            ) {
              setErro(
                "Não foi possível identificar o status do cadastro."
              );

              setCarregando(false);
              return;
            }

            setParceiro({
              nome: dados.nome || "Parceiro",
              empresa: dados.empresa || "",
              email: dados.email || usuarioAtual.email || "",
              status,
            });

            setErro("");
            setCarregando(false);

            // LIBERAR PARCEIRO APROVADO

            if (status === "aprovado") {
              router.replace("/parceiros");
            }
          },

          (error) => {
            console.error(
              "Erro ao consultar status:",
              error
            );

            setErro(
              "Não foi possível consultar seu cadastro. Verifique sua conexão e tente novamente."
            );

            setCarregando(false);
          }
        );
      },

      (error) => {
        console.error(
          "Erro de autenticação:",
          error
        );

        setErro(
          "Não foi possível verificar sua sessão."
        );

        setCarregando(false);
      }
    );

    return () => {
      cancelarAuth();
      cancelarConsulta?.();
    };
  }, [router]);

  // ==========================================
  // SAIR DA CONTA
  // ==========================================

  async function sair() {
    try {
      await signOut(auth);

      router.replace("/login");
    } catch (error) {
      console.error(error);

      setErro(
        "Não foi possível sair da conta. Tente novamente."
      );
    }
  }

  // ==========================================
  // CARREGAMENTO
  // ==========================================

  if (carregando) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-black px-5 text-white">

        <div className="text-center">

          <div className="mx-auto mb-6 h-14 w-14 animate-spin rounded-full border-4 border-purple-900 border-t-purple-400" />

          <h1 className="text-xl font-black">
            Consultando sua magia...
          </h1>

          <p className="mt-3 text-sm text-gray-400">
            Estamos verificando sua solicitação.
          </p>

        </div>

      </main>
    );
  }

  // ==========================================
  // INTERFACE PRINCIPAL
  // ==========================================

  return (
    <main className="relative min-h-screen overflow-x-hidden bg-black text-white">

      {/* LUZES DE FUNDO */}

      <div className="pointer-events-none absolute left-0 top-0 h-96 w-96 rounded-full bg-purple-900/15 blur-[130px]" />

      <div className="pointer-events-none absolute right-0 top-40 h-96 w-96 rounded-full bg-red-900/15 blur-[130px]" />

      {/* ======================================
          CABEÇALHO
      ====================================== */}

      <header className="relative z-20 border-b border-purple-500/20 bg-black/90">

        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-5">

          <Link href="/" className="min-w-0">

            <h1 className="text-base font-black sm:text-xl">
              AÇAÍ DO{" "}
              <span className="text-purple-400">
                BRUXO
              </span>
            </h1>

            <p className="mt-1 text-[8px] font-bold uppercase tracking-[2px] text-purple-300">
              Portal de parceiros
            </p>

          </Link>

          <button
            type="button"
            onClick={sair}
            className="shrink-0 rounded-xl border border-red-500/30 px-4 py-3 text-xs font-bold text-red-300 transition hover:bg-red-950/50"
          >
            Sair da conta
          </button>

        </div>

      </header>

      {/* ======================================
          IMAGEM PRINCIPAL DO MAGO
      ====================================== */}

      <section className="relative mx-auto w-full max-w-6xl overflow-hidden">

        {/* ILUMINAÇÃO */}

        <div className="pointer-events-none absolute left-1/2 top-1/2 h-64 w-[80%] -translate-x-1/2 -translate-y-1/2 rounded-full bg-purple-800/20 blur-[90px]" />

        {/* ARTE RETANGULAR */}

        <div className="relative mx-auto flex w-full items-center justify-center">

          <Image
            src="/status-bruxo.png"
            alt="Bruxo conjurando magia com frutos de açaí"
            width={1672}
            height={941}
            priority
            sizes="(max-width: 768px) 100vw, 1152px"
            className="h-auto w-full object-contain drop-shadow-[0_15px_35px_rgba(168,85,247,0.2)]"
          />

        </div>

      </section>

      {/* ======================================
          CONTEÚDO DE STATUS
      ====================================== */}

      <section className="relative z-10 mx-auto max-w-3xl px-5 pb-20 pt-5">

        {/* ERROS */}

        {erro && (

          <div
            role="alert"
            className="mb-8 rounded-2xl border border-red-500/40 bg-red-950/30 p-6 text-center text-sm leading-7 text-red-200"
          >

            {erro}

            <button
              type="button"
              onClick={() => window.location.reload()}
              className="mx-auto mt-5 block rounded-xl border border-red-400/40 px-6 py-3 font-bold"
            >
              Tentar novamente
            </button>

          </div>

        )}

        {/* STATUS PENDENTE */}

        {parceiro?.status === "pendente" && (

          <div className="text-center">

            {/* SELO */}

            <div className="inline-flex items-center gap-3 rounded-full border border-yellow-500/40 bg-yellow-500/10 px-6 py-3">

              <span className="h-3 w-3 animate-pulse rounded-full bg-yellow-400 shadow-[0_0_15px_#facc15]" />

              <span className="text-xs font-black uppercase tracking-[2px] text-yellow-300">

                Solicitação pendente

              </span>

            </div>

            {/* TÍTULO */}

            <h2 className="mt-9 text-4xl font-black leading-tight sm:text-6xl">

              SUA MAGIA
              <br />

              <span className="bg-gradient-to-r from-purple-400 via-fuchsia-400 to-red-500 bg-clip-text text-transparent">

                ESTÁ EM ANÁLISE.

              </span>

            </h2>

            {/* MENSAGEM */}

            <p className="mx-auto mt-7 max-w-xl text-base leading-8 text-gray-400">

              Olá,{" "}

              <span className="font-bold text-white">
                {parceiro.nome}
              </span>

              !

              Recebemos sua solicitação para fazer
              parte do universo do Açaí do Bruxo.

              Nossa equipe está analisando
              seu cadastro.

            </p>

            {/* ======================================
                CARD DO STATUS
            ====================================== */}

            <div className="mt-12 overflow-hidden rounded-[30px] border border-purple-500/30 bg-[#13091d] p-6 text-left shadow-[0_0_55px_rgba(126,34,206,0.12)] sm:p-9">

              <div className="mb-8 flex items-center justify-between gap-4 border-b border-purple-500/20 pb-6">

                <div>

                  <p className="text-[10px] font-bold uppercase tracking-[3px] text-purple-400">

                    Seu estabelecimento

                  </p>

                  <h3 className="mt-3 break-words text-xl font-black">

                    {parceiro.empresa}

                  </h3>

                </div>

                <span className="text-3xl">
                  🧙‍♂️
                </span>

              </div>

              {/* ETAPAS */}

              <div className="space-y-8">

                {/* ETAPA 1 */}

                <div className="flex items-start gap-4">

                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-green-500/40 bg-green-500/10 font-black text-green-400">

                    ✓

                  </div>

                  <div>

                    <h4 className="font-black">
                      Solicitação recebida
                    </h4>

                    <p className="mt-2 text-sm leading-6 text-gray-400">
                      Seu cadastro foi enviado com sucesso.
                    </p>

                  </div>

                </div>

                {/* ETAPA 2 */}

                <div className="flex items-start gap-4">

                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-yellow-500/40 bg-yellow-500/10 font-black text-yellow-300">

                    02

                  </div>

                  <div>

                    <h4 className="font-black text-yellow-300">
                      Análise da equipe
                    </h4>

                    <p className="mt-2 text-sm leading-6 text-gray-400">
                      Estamos aguardando a aprovação
                      do responsável.
                    </p>

                  </div>

                </div>

                {/* ETAPA 3 */}

                <div className="flex items-start gap-4 opacity-40">

                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-purple-500/40 bg-purple-500/10 font-black">

                    03

                  </div>

                  <div>

                    <h4 className="font-black">
                      Acesso liberado
                    </h4>

                    <p className="mt-2 text-sm leading-6 text-gray-400">
                      Seu portal será disponibilizado
                      após a aprovação.
                    </p>

                  </div>

                </div>

              </div>

            </div>

            {/* AVISO DE ATUALIZAÇÃO */}

            <div className="mt-8 rounded-2xl border border-purple-500/20 bg-purple-950/20 p-6">

              <div className="mx-auto mb-4 h-3 w-3 animate-pulse rounded-full bg-purple-400 shadow-[0_0_15px_#a855f7]" />

              <p className="text-sm leading-7 text-purple-200">

                Estamos acompanhando sua solicitação.

                Esta página será atualizada
                automaticamente quando seu cadastro
                for aprovado.

              </p>

            </div>

            {/* CONTA */}

            <p className="mt-9 break-all text-xs text-gray-600">

              Conta cadastrada: {parceiro.email}

            </p>

          </div>

        )}

        {/* ======================================
            CADASTRO REJEITADO
        ====================================== */}

        {parceiro?.status === "rejeitado" && (

          <div className="rounded-3xl border border-red-500/30 bg-red-950/20 p-8 text-center">

            <span className="text-5xl">
              ⚠️
            </span>

            <h2 className="mt-6 text-3xl font-black">

              Solicitação não aprovada

            </h2>

            <p className="mt-5 leading-8 text-gray-400">

              Olá, {parceiro.nome}.

              Sua solicitação não foi aprovada
              neste momento.

              Entre em contato com nossa equipe
              caso precise de mais informações.

            </p>

          </div>

        )}

        {/* ======================================
            APROVAÇÃO EM PROCESSAMENTO
        ====================================== */}

        {parceiro?.status === "aprovado" && (

          <div className="py-10 text-center">

            <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-green-900 border-t-green-400" />

            <h2 className="mt-6 text-2xl font-black text-green-400">

              Acesso aprovado!

            </h2>

            <p className="mt-3 text-gray-400">

              Abrindo seu portal de parceiros...

            </p>

            <Link
              href="/parceiros"
              className="mt-7 inline-block rounded-xl bg-purple-600 px-7 py-4 font-bold"
            >

              Entrar no portal →

            </Link>

          </div>

        )}

      </section>

      {/* ======================================
          RODAPÉ
      ====================================== */}

      <footer className="relative z-10 border-t border-purple-500/20 bg-black px-5 py-8 text-center">

        <h2 className="font-black">

          AÇAÍ DO{" "}

          <span className="text-purple-400">
            BRUXO
          </span>

        </h2>

        <p className="mt-3 text-xs text-gray-600">

          © {new Date().getFullYear()} Açaí do Bruxo.

        </p>

      </footer>

    </main>
  );
}