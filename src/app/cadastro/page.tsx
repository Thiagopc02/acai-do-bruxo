
"use client";

import Image from "next/image";
import Link from "next/link";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

import {
  createUserWithEmailAndPassword,
  signOut,
} from "firebase/auth";

import {
  doc,
  setDoc,
  serverTimestamp,
} from "firebase/firestore";

import { auth, db } from "../firebase/config";

// ==========================================
// PÁGINA DE CADASTRO DE PARCEIROS
// ==========================================

export default function CadastroPage() {
  const router = useRouter();

  // ==========================================
  // DADOS DO PARCEIRO
  // ==========================================

  const [nome, setNome] = useState("");
  const [empresa, setEmpresa] = useState("");
  const [telefone, setTelefone] = useState("");

  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [confirmarSenha, setConfirmarSenha] = useState("");

  // ==========================================
  // CONTROLES
  // ==========================================

  const [mostrarSenha, setMostrarSenha] = useState(false);

  const [carregando, setCarregando] = useState(false);

  const [erro, setErro] = useState("");

  const [emailJaCadastrado, setEmailJaCadastrado] =
    useState(false);

  // ==========================================
  // MÁSCARA DO CELULAR
  // ==========================================

  function formatarTelefone(valor: string) {
    const numeros = valor.replace(/\D/g, "").slice(0, 11);

    if (numeros.length <= 2) {
      return numeros;
    }

    if (numeros.length <= 6) {
      return `(${numeros.slice(0, 2)}) ${numeros.slice(2)}`;
    }

    if (numeros.length <= 10) {
      return `(${numeros.slice(0, 2)}) ${numeros.slice(
        2,
        6
      )}-${numeros.slice(6)}`;
    }

    return `(${numeros.slice(0, 2)}) ${numeros.slice(
      2,
      7
    )}-${numeros.slice(7)}`;
  }

  // ==========================================
  // REALIZAR CADASTRO
  // ==========================================

  async function cadastrarParceiro(
    evento: FormEvent<HTMLFormElement>
  ) {
    evento.preventDefault();

    if (carregando) return;

setErro("");
setEmailJaCadastrado(false);
setCarregando(true);

    // ======================================
    // VALIDAÇÕES
    // ======================================

    if (nome.trim().length < 3) {
      setErro("Informe seu nome completo.");
      setCarregando(false);
      return;
    }

    if (empresa.trim().length < 2) {
      setErro("Informe o nome do seu estabelecimento.");
      setCarregando(false);
      return;
    }

    const telefoneLimpo = telefone.replace(/\D/g, "");

    if (telefoneLimpo.length !== 11) {
      setErro("Informe um celular válido com DDD.");
      setCarregando(false);
      return;
    }

    const emailNormalizado = email.trim().toLowerCase();

    if (!emailNormalizado) {
      setErro("Informe seu e-mail.");
      setCarregando(false);
      return;
    }

    if (senha.length < 8) {
      setErro(
        "Sua senha deve conter pelo menos 8 caracteres."
      );

      setCarregando(false);
      return;
    }

    if (senha !== confirmarSenha) {
      setErro("As senhas informadas não são iguais.");
      setCarregando(false);
      return;
    }

    // IDENTIFICA SE O AUTHENTICATION FOI CRIADO

    let contaCriada = false;

    // IDENTIFICA SE O FIRESTORE FOI SALVO

    let perfilSalvo = false;

    try {
      // ======================================
      // 1. CRIAR CONTA NO FIREBASE AUTH
      // ======================================

      const credencial = await createUserWithEmailAndPassword(
        auth,
        emailNormalizado,
        senha
      );

      const usuario = credencial.user;

      contaCriada = true;

      // ======================================
      // 2. REFERÊNCIA DO DOCUMENTO
      // ======================================

      // O documento terá o mesmo ID do usuário
      // cadastrado no Authentication.

      const parceiroRef = doc(
        db,
        "parceiros",
        usuario.uid
      );

      // ======================================
      // 3. SALVAR DADOS NO FIRESTORE
      // ======================================

      await setDoc(parceiroRef, {
        nome: nome.trim(),

        empresa: empresa.trim(),

        telefone: telefoneLimpo,

        email: usuario.email,

        status: "pendente",

        criadoEm: serverTimestamp(),
      });

      perfilSalvo = true;

      // ======================================
      // 4. CADASTRO CONCLUÍDO
      // ======================================

      // NÃO FAZER LOGOUT AQUI.
      //
      // O usuário precisa permanecer autenticado
      // para consultar seu próprio documento
      // na página de status.

      // ======================================
      // 5. REDIRECIONAR PARA STATUS
      // ======================================

      router.replace("/status");

      return;

    } catch (error: unknown) {
      console.error(
        "Erro ao cadastrar parceiro:",
        error
      );

      let codigo = "";

      if (
        typeof error === "object" &&
        error !== null &&
        "code" in error
      ) {
        codigo = String(error.code);
      }

      // ======================================
      // CONTA CRIADA, MAS PERFIL NÃO SALVO
      // ======================================

      if (contaCriada && !perfilSalvo) {
        // Não tentamos criar outra conta.
        // Encerramos a sessão para evitar
        // um estado de cadastro incompleto.

        try {
          await signOut(auth);
        } catch (erroSaida) {
          console.error(
            "Erro ao encerrar sessão:",
            erroSaida
          );
        }

        setErro(
          "Sua conta foi criada, mas não conseguimos finalizar sua solicitação. Entre em contato com nossa equipe antes de tentar novamente."
        );

        return;
      }

      // ======================================
      // TRATAMENTO DOS ERROS DO FIREBASE
      // ======================================

      switch (codigo) {
        // E-MAIL JÁ CADASTRADO

        case "auth/email-already-in-use":
          setEmailJaCadastrado(true);

          setErro(
            "Este e-mail já possui uma conta cadastrada. Faça login para consultar o status da sua solicitação."
          );

          break;

        // E-MAIL INVÁLIDO

        case "auth/invalid-email":
          setErro(
            "O e-mail informado não é válido."
          );

          break;

        // SENHA FRACA

        case "auth/weak-password":
          setErro(
            "Escolha uma senha mais forte, com pelo menos 8 caracteres."
          );

          break;

        // CONEXÃO

        case "auth/network-request-failed":
          setErro(
            "Erro de conexão. Verifique sua internet e tente novamente."
          );

          break;

        // PERMISSÕES DO FIRESTORE

        case "permission-denied":
        case "firestore/permission-denied":
          setErro(
            "Não foi possível salvar sua solicitação. Entre em contato com nossa equipe."
          );

          break;

        // OUTROS ERROS

        default:
          setErro(
            "Não foi possível realizar o cadastro. Tente novamente."
          );

          break;
      }

    } finally {
      setCarregando(false);
    }
  }

  // ==========================================
  // INTERFACE DO CADASTRO
  // ==========================================

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#0d0613] px-4 py-12 text-white">

      {/* =====================================
          ILUMINAÇÃO DO FUNDO
      ===================================== */}

      <div className="pointer-events-none absolute -left-32 top-0 h-96 w-96 rounded-full bg-purple-700/20 blur-[120px]" />

      <div className="pointer-events-none absolute -right-32 bottom-0 h-96 w-96 rounded-full bg-fuchsia-700/20 blur-[120px]" />

      <div className="relative mx-auto w-full max-w-lg">

        {/* =====================================
            VOLTAR PARA O LOGIN
        ===================================== */}

        <Link
          href="/login"
          className="mb-8 inline-flex text-sm text-gray-400 transition hover:text-purple-300"
        >
          ← Voltar para o login
        </Link>

        {/* =====================================
            CARD PRINCIPAL
        ===================================== */}

        <div className="rounded-[32px] border border-purple-500/25 bg-[#1a0c29] p-6 shadow-2xl sm:p-9">

          {/* =====================================
              IMAGEM DO MAGO
          ===================================== */}

          <div className="relative mx-auto flex h-36 items-center justify-center">

            <div className="absolute h-28 w-28 rounded-full bg-purple-600/30 blur-[55px]" />

            <Image
              src="/mago.png"
              alt="Mago do Açaí do Bruxo"
              width={160}
              height={190}
              priority
              className="relative h-36 w-auto object-contain"
            />

          </div>

          {/* =====================================
              IDENTIDADE VISUAL
          ===================================== */}

          <div className="mt-5 text-center">

            <h1 className="text-2xl font-black">

              AÇAÍ DO{" "}

              <span className="text-purple-400">
                BRUXO
              </span>

            </h1>

            <p className="mt-2 text-[10px] font-bold uppercase tracking-[3px] text-purple-300">

              Cadastro de parceiros

            </p>

          </div>

          {/* =====================================
              TÍTULO
          ===================================== */}

          <div className="mt-10">

            <h2 className="text-3xl font-black">

              Faça parte da
              <br />

              <span className="text-purple-400">

                nossa magia.

              </span>

            </h2>

            <p className="mt-4 text-sm leading-7 text-gray-400">

              Preencha seus dados para solicitar
              acesso ao nosso portal exclusivo.

            </p>

          </div>

          {/* =====================================
              FORMULÁRIO
          ===================================== */}

          <form
            onSubmit={cadastrarParceiro}
            className="mt-9 space-y-6"
          >

            {/* =====================================
                NOME COMPLETO
            ===================================== */}

            <div>

              <label
                htmlFor="nome"
                className="mb-2 block text-sm font-bold text-gray-300"
              >

                Nome completo *

              </label>

              <input
                id="nome"
                type="text"
                required
                minLength={3}
                maxLength={120}
                autoComplete="name"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                disabled={carregando}
                placeholder="Seu nome completo"
                className="w-full rounded-xl border border-purple-500/20 bg-[#100719] px-4 py-4 text-sm outline-none placeholder:text-gray-600 focus:border-purple-500 disabled:opacity-60"
              />

            </div>

            {/* =====================================
                NOME DO ESTABELECIMENTO
            ===================================== */}

            <div>

              <label
                htmlFor="empresa"
                className="mb-2 block text-sm font-bold text-gray-300"
              >

                Nome do estabelecimento *

              </label>

              <input
                id="empresa"
                type="text"
                required
                minLength={2}
                maxLength={150}
                value={empresa}
                onChange={(e) => setEmpresa(e.target.value)}
                disabled={carregando}
                placeholder="Ex.: Açaí do Centro"
                className="w-full rounded-xl border border-purple-500/20 bg-[#100719] px-4 py-4 text-sm outline-none placeholder:text-gray-600 focus:border-purple-500 disabled:opacity-60"
              />

            </div>

            {/* =====================================
                CELULAR COM DDD
            ===================================== */}

            <div>

              <label
                htmlFor="telefone"
                className="mb-2 block text-sm font-bold text-gray-300"
              >

                Celular com DDD *

              </label>

              <input
                id="telefone"
                type="tel"
                required
                autoComplete="tel-national"
                inputMode="tel"
                value={telefone}
                onChange={(e) =>
                  setTelefone(
                    formatarTelefone(e.target.value)
                  )
                }
                disabled={carregando}
                placeholder="(62) 99999-9999"
                maxLength={15}
                className="w-full rounded-xl border border-purple-500/20 bg-[#100719] px-4 py-4 text-sm outline-none placeholder:text-gray-600 focus:border-purple-500 disabled:opacity-60"
              />

            </div>

            {/* =====================================
                E-MAIL
            ===================================== */}

            <div>

              <label
                htmlFor="email"
                className="mb-2 block text-sm font-bold text-gray-300"
              >

                E-mail *

              </label>

              <input
                id="email"
                type="email"
                required
                maxLength={254}
                autoComplete="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setEmailJaCadastrado(false);
                }}
                disabled={carregando}
                placeholder="seuemail@exemplo.com"
                className="w-full rounded-xl border border-purple-500/20 bg-[#100719] px-4 py-4 text-sm outline-none placeholder:text-gray-600 focus:border-purple-500 disabled:opacity-60"
              />

            </div>

            {/* =====================================
                CRIAR SENHA
            ===================================== */}

            <div>

              <label
                htmlFor="senha"
                className="mb-2 block text-sm font-bold text-gray-300"
              >

                Crie uma senha *

              </label>

              <div className="relative">

                <input
                  id="senha"
                  type={
                    mostrarSenha
                      ? "text"
                      : "password"
                  }
                  required
                  minLength={8}
                  autoComplete="new-password"
                  value={senha}
                  onChange={(e) =>
                    setSenha(e.target.value)
                  }
                  disabled={carregando}
                  placeholder="Mínimo de 8 caracteres"
                  className="w-full rounded-xl border border-purple-500/20 bg-[#100719] px-4 py-4 pr-20 text-sm outline-none placeholder:text-gray-600 focus:border-purple-500 disabled:opacity-60"
                />

                {/* MOSTRAR SENHA */}

                <button
                  type="button"
                  onClick={() =>
                    setMostrarSenha(!mostrarSenha)
                  }
                  className="absolute inset-y-0 right-4 text-xs font-bold text-purple-400"
                  aria-label={
                    mostrarSenha
                      ? "Ocultar senha"
                      : "Mostrar senha"
                  }
                >

                  {mostrarSenha
                    ? "Ocultar"
                    : "Mostrar"}

                </button>

              </div>

            </div>

            {/* =====================================
                CONFIRMAR SENHA
            ===================================== */}

            <div>

              <label
                htmlFor="confirmarSenha"
                className="mb-2 block text-sm font-bold text-gray-300"
              >

                Confirme sua senha *

              </label>

              <input
                id="confirmarSenha"
                type={
                  mostrarSenha
                    ? "text"
                    : "password"
                }
                required
                minLength={8}
                autoComplete="new-password"
                value={confirmarSenha}
                onChange={(e) =>
                  setConfirmarSenha(e.target.value)
                }
                disabled={carregando}
                placeholder="Digite novamente sua senha"
                className="w-full rounded-xl border border-purple-500/20 bg-[#100719] px-4 py-4 text-sm outline-none placeholder:text-gray-600 focus:border-purple-500 disabled:opacity-60"
              />

            </div>

            {/* =====================================
                AVISO SOBRE APROVAÇÃO
            ===================================== */}

            <div className="rounded-xl border border-purple-500/20 bg-purple-500/10 p-4">

              <p className="text-xs leading-6 text-purple-200">

                Ao realizar seu cadastro, seus dados
                serão encaminhados para análise.

                O acesso ao portal será liberado
                após aprovação da nossa equipe.

              </p>

            </div>

            {/* =====================================
                MENSAGEM DE ERRO
            ===================================== */}

            {erro && (

              <div
                role="alert"
                className="rounded-xl border border-red-500/30 bg-red-500/10 p-5 text-sm leading-7 text-red-300"
              >

                <p className="font-bold">
                  Atenção!
                </p>

                <p className="mt-2">
                  {erro}
                </p>

                {/* CONTA JÁ CADASTRADA */}

                {emailJaCadastrado && (

                  <Link
                    href="/login"
                    className="mt-5 flex w-full items-center justify-center rounded-xl bg-white px-5 py-4 text-center font-black text-black transition hover:bg-gray-200"
                  >

                    Fazer login →

                  </Link>

                )}

              </div>

            )}

            {/* =====================================
                BOTÃO SOLICITAR CADASTRO
            ===================================== */}

            <button
              type="submit"
              disabled={carregando}
              className="flex w-full items-center justify-center rounded-xl bg-purple-600 px-6 py-4 font-bold shadow-lg shadow-purple-950/40 transition hover:bg-purple-500 disabled:cursor-not-allowed disabled:opacity-60"
            >

              {carregando
                ? "Enviando sua solicitação..."
                : "Solicitar meu cadastro →"}

            </button>

          </form>

          {/* =====================================
              ÁREA DE LOGIN
          ===================================== */}

          <div className="mt-8 border-t border-purple-500/20 pt-6 text-center">

            <p className="text-sm text-gray-400">

              Já possui uma conta?

            </p>

            <Link
              href="/login"
              className="mt-2 inline-block text-sm font-bold text-purple-400 transition hover:text-purple-300"
            >

              Faça seu login →

            </Link>

          </div>

        </div>

        {/* =====================================
            RODAPÉ
        ===================================== */}

        <p className="mt-8 text-center text-xs text-gray-600">

          © {new Date().getFullYear()} Açaí do Bruxo.

        </p>

      </div>

    </main>
  );
}