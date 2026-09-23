
"use client";

import Image from "next/image";
import Link from "next/link";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import {
  onAuthStateChanged,
  signOut,
} from "firebase/auth";

import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  onSnapshot,
  serverTimestamp,
  updateDoc,
  Timestamp,
} from "firebase/firestore";

import { auth, db } from "../../firebase/config";

// ==========================================
// TIPOS
// ==========================================

type Promocao = {
  id: string;
  titulo: string;
  descricao: string;
  desconto: number;
  ativa: boolean;
  criadoEm?: Timestamp;
};

// ==========================================
// PÁGINA DE PROMOÇÕES
// ==========================================

export default function PromocoesPage() {
  const router = useRouter();

  // ========================================
  // AUTENTICAÇÃO
  // ========================================

  const [carregando, setCarregando] =
    useState(true);

  const [autorizado, setAutorizado] =
    useState(false);

  // ========================================
  // FORMULÁRIO
  // ========================================

  const [titulo, setTitulo] =
    useState("");

  const [descricao, setDescricao] =
    useState("");

  const [desconto, setDesconto] =
    useState("");

  const [salvando, setSalvando] =
    useState(false);

  // ========================================
  // PROMOÇÕES
  // ========================================

  const [promocoes, setPromocoes] =
    useState<Promocao[]>([]);

  const [carregandoPromocoes, setCarregandoPromocoes] =
    useState(true);

  const [erro, setErro] =
    useState("");

  const [sucesso, setSucesso] =
    useState("");

  // ========================================
  // VERIFICAR ADMINISTRADOR
  // ========================================

  useEffect(() => {
    let ativo = true;

    let cancelarPromocoes:
      (() => void) | undefined;

    const cancelarAuth = onAuthStateChanged(
      auth,

      async (usuario) => {
        if (cancelarPromocoes) {
          cancelarPromocoes();
          cancelarPromocoes = undefined;
        }

        if (!ativo) return;

        setAutorizado(false);
        setCarregando(true);
        setErro("");

        if (!usuario) {
          router.replace("/admin/login");
          return;
        }

        try {
          // CONSULTAR ADMINISTRADOR

          const adminRef = doc(
            db,
            "admins",
            usuario.uid
          );

          const adminSnapshot =
            await getDoc(adminRef);

          if (!ativo) return;

          // VERIFICAR PERMISSÕES

          if (
            !adminSnapshot.exists() ||
            adminSnapshot.data().role !== "admin" ||
            adminSnapshot.data().ativo !== true
          ) {
            await signOut(auth);

            if (ativo) {
              router.replace("/admin/login");
            }

            return;
          }

          // ACESSO AUTORIZADO

          setAutorizado(true);
          setCarregando(false);

          // BUSCAR PROMOÇÕES EM TEMPO REAL

          cancelarPromocoes = onSnapshot(
            collection(db, "promocoes"),

            (snapshot) => {
              if (!ativo) return;

              const lista: Promocao[] =
                snapshot.docs.map((documento) => {
                  const dados = documento.data();

                  return {
                    id: documento.id,

                    titulo: dados.titulo || "",

                    descricao:
                      dados.descricao || "",

                    desconto:
                      dados.desconto || 0,

                    ativa:
                      dados.ativa === true,

                    criadoEm:
                      dados.criadoEm,
                  };
                });

              // ORGANIZAR POR DATA

              lista.sort((a, b) => {
                const dataA =
                  a.criadoEm?.toMillis() || 0;

                const dataB =
                  b.criadoEm?.toMillis() || 0;

                return dataB - dataA;
              });

              setPromocoes(lista);

              setCarregandoPromocoes(false);
              setErro("");
            },

            (error) => {
              console.error(
                "Erro ao carregar promoções:",
                error
              );

              if (ativo) {
                setCarregandoPromocoes(false);

                setErro(
                  "Não foi possível carregar as promoções. Verifique as regras do Firestore."
                );
              }
            }
          );
        } catch (error) {
          console.error(
            "Erro ao verificar administrador:",
            error
          );

          if (ativo) {
            setCarregando(false);

            setErro(
              "Não foi possível verificar sua autorização."
            );
          }
        }
      }
    );

    return () => {
      ativo = false;

      cancelarAuth();

      if (cancelarPromocoes) {
        cancelarPromocoes();
      }
    };
  }, [router]);

  // ========================================
  // CADASTRAR PROMOÇÃO
  // ========================================

  async function cadastrarPromocao(
    evento: React.FormEvent<HTMLFormElement>
  ) {
    evento.preventDefault();

    if (!autorizado || salvando) return;

    setErro("");
    setSucesso("");

    // VALIDAÇÕES

    if (titulo.trim().length < 3) {
      setErro(
        "Informe um nome válido para a promoção."
      );

      return;
    }

    const valorDesconto = Number(desconto);

    if (
      !Number.isFinite(valorDesconto) ||
      valorDesconto <= 0 ||
      valorDesconto > 100
    ) {
      setErro(
        "Informe um desconto entre 0,01% e 100%."
      );

      return;
    }

    setSalvando(true);

    try {
      // SALVAR NO FIRESTORE

      await addDoc(
        collection(db, "promocoes"),

        {
          titulo: titulo.trim(),

          descricao: descricao.trim(),

          desconto: valorDesconto,

          ativa: false,

          produto: "barra-acai",

          criadoEm: serverTimestamp(),

          criadoPor: auth.currentUser?.uid,
        }
      );

      // LIMPAR FORMULÁRIO

      setTitulo("");
      setDescricao("");
      setDesconto("");

      setSucesso(
        "Promoção cadastrada! Ela está desativada até você decidir ativá-la."
      );
    } catch (error) {
      console.error(
        "Erro ao cadastrar promoção:",
        error
      );

      setErro(
        "Não foi possível cadastrar a promoção. Verifique as permissões do Firestore."
      );
    } finally {
      setSalvando(false);
    }
  }

  // ========================================
  // ATIVAR OU DESATIVAR
  // ========================================

  async function alterarStatus(
    promocao: Promocao
  ) {
    if (!autorizado) return;

    setErro("");
    setSucesso("");

    try {
      await updateDoc(
        doc(
          db,
          "promocoes",
          promocao.id
        ),

        {
          ativa: !promocao.ativa,

          atualizadoEm: serverTimestamp(),
        }
      );

      setSucesso(
        promocao.ativa
          ? "Promoção desativada com sucesso."
          : "Promoção ativada com sucesso."
      );
    } catch (error) {
      console.error(
        "Erro ao alterar promoção:",
        error
      );

      setErro(
        "Não foi possível alterar o status da promoção."
      );
    }
  }

  // ========================================
  // EXCLUIR PROMOÇÃO
  // ========================================

  async function excluirPromocao(
    promocao: Promocao
  ) {
    if (!autorizado) return;

    const confirmar = window.confirm(
      `Deseja realmente excluir a promoção "${promocao.titulo}"?`
    );

    if (!confirmar) return;

    setErro("");
    setSucesso("");

    try {
      await deleteDoc(
        doc(
          db,
          "promocoes",
          promocao.id
        )
      );

      setSucesso(
        "Promoção excluída com sucesso."
      );
    } catch (error) {
      console.error(
        "Erro ao excluir promoção:",
        error
      );

      setErro(
        "Não foi possível excluir a promoção."
      );
    }
  }

  // ========================================
  // RESUMO
  // ========================================

  const total = promocoes.length;

  const ativas = promocoes.filter(
    (promocao) => promocao.ativa
  ).length;

  // ========================================
  // TELA DE CARREGAMENTO
  // ========================================

  if (carregando) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-5 bg-[#08050e] text-white">

        <Image
          src="/mago.png"
          alt="Açaí do Bruxo"
          width={140}
          height={180}
          priority
          className="h-auto w-32"
        />

        <div className="h-10 w-10 animate-spin rounded-full border-4 border-purple-500/20 border-t-purple-500" />

        <p className="text-sm text-purple-300">
          Carregando central de promoções...
        </p>

      </main>
    );
  }

  // ========================================
  // ACESSO NEGADO
  // ========================================

  if (!autorizado) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-5 bg-[#08050e] px-6 text-center text-white">

        <h1 className="text-2xl font-black">
          Acesso não autorizado
        </h1>

        <p className="text-sm text-gray-400">
          {erro || "Área exclusiva do proprietário."}
        </p>

        <Link
          href="/admin/login"
          className="rounded-xl bg-purple-600 px-7 py-4 font-bold"
        >
          Voltar ao login
        </Link>

      </main>
    );
  }

  // ========================================
  // INTERFACE PRINCIPAL
  // ========================================

  return (
    <main className="min-h-screen bg-[#08050e] text-white">

      {/* =====================================
          CABEÇALHO
      ===================================== */}

      <header className="sticky top-0 z-50 border-b border-purple-500/20 bg-black">

        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-5 sm:px-6">

          <Link
            href="/admin/dashboard"
            className="flex min-w-0 items-center gap-3"
          >

            <span className="text-xl text-purple-400">
              ←
            </span>

            <div>

              <h1 className="text-lg font-black sm:text-xl">
                PROMOÇÕES
              </h1>

              <p className="text-[9px] font-bold uppercase tracking-[2px] text-purple-300">
                Açaí do Bruxo • Admin
              </p>

            </div>

          </Link>

          <div className="rounded-xl border border-purple-500/20 bg-purple-500/10 p-3 text-xl">
            🏷️
          </div>

        </div>

      </header>

      {/* =====================================
          CONTEÚDO
      ===================================== */}

      <div className="mx-auto max-w-7xl px-4 pb-20 pt-8 sm:px-6">

        {/* =====================================
            APRESENTAÇÃO
        ===================================== */}

        <section className="relative overflow-hidden rounded-[28px] border border-purple-500/20 bg-gradient-to-br from-[#301044] via-[#1c0c2c] to-[#08050e] p-6 sm:p-10">

          <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-purple-600/20 blur-[90px]" />

          <div className="relative">

            <span className="text-xs font-bold uppercase tracking-[3px] text-purple-300">
              Central de ofertas
            </span>

            <h2 className="mt-6 text-3xl font-black leading-tight sm:text-5xl">

              CRIE OFERTAS
              <br />

              <span className="bg-gradient-to-r from-purple-300 via-fuchsia-400 to-blue-400 bg-clip-text text-transparent">
                ESPECIAIS.
              </span>

            </h2>

            <p className="mt-6 max-w-2xl text-sm leading-7 text-gray-400 sm:text-base">

              Cadastre promoções exclusivas para seus
              parceiros, organize seus descontos e
              controle quais ofertas estarão ativas.

            </p>

          </div>

        </section>

        {/* =====================================
            AVISOS
        ===================================== */}

        {erro && (

          <div
            role="alert"
            className="mt-6 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm leading-6 text-red-300"
          >
            {erro}
          </div>

        )}

        {sucesso && (

          <div
            role="status"
            className="mt-6 rounded-xl border border-green-500/30 bg-green-500/10 p-4 text-sm leading-6 text-green-300"
          >
            {sucesso}
          </div>

        )}

        {/* =====================================
            INDICADORES
        ===================================== */}

        <section className="mt-8 grid grid-cols-2 gap-4">

          {/* TOTAL */}

          <div className="rounded-2xl border border-purple-500/20 bg-[#1a1025] p-5">

            <span className="text-2xl">
              🏷️
            </span>

            <p className="mt-5 text-4xl font-black text-purple-400">
              {carregandoPromocoes ? "—" : total}
            </p>

            <p className="mt-2 text-xs text-gray-400 sm:text-sm">
              Total de promoções
            </p>

          </div>

          {/* ATIVAS */}

          <div className="rounded-2xl border border-green-500/20 bg-[#1a1025] p-5">

            <span className="text-2xl">
              ✅
            </span>

            <p className="mt-5 text-4xl font-black text-green-400">
              {carregandoPromocoes ? "—" : ativas}
            </p>

            <p className="mt-2 text-xs text-gray-400 sm:text-sm">
              Promoções ativas
            </p>

          </div>

        </section>

        {/* =====================================
            CADASTRAR PROMOÇÃO
        ===================================== */}

        <section className="mt-12">

          <span className="text-xs font-bold uppercase tracking-[3px] text-purple-400">
            Gerenciamento
          </span>

          <h2 className="mt-3 text-2xl font-black sm:text-3xl">
            Nova promoção
          </h2>

          <p className="mt-3 text-sm text-gray-400">
            Preencha os dados abaixo para criar uma oferta.
          </p>

          <form
            onSubmit={cadastrarPromocao}
            className="mt-7 space-y-6 rounded-[28px] border border-purple-500/20 bg-[#1a1025] p-5 sm:p-8"
          >

            {/* PRODUTO */}

            <div className="rounded-2xl border border-purple-500/20 bg-[#100719] p-4">

              <div className="flex items-center gap-4">

                <div className="relative flex h-20 w-20 shrink-0 items-center justify-center rounded-xl bg-purple-900/20">

                  <Image
                    src="/acai-macunaima.png"
                    alt="Barra de Açaí"
                    width={65}
                    height={80}
                    className="h-16 w-auto object-contain"
                  />

                </div>

                <div>

                  <span className="text-[10px] font-bold uppercase tracking-[2px] text-purple-400">
                    Produto selecionado
                  </span>

                  <h3 className="mt-2 font-black">
                    Barra de Açaí
                  </h3>

                  <p className="mt-1 text-xs text-gray-400">
                    Produto exclusivo dos parceiros
                  </p>

                </div>

              </div>

            </div>

            {/* NOME */}

            <div>

              <label
                htmlFor="titulo"
                className="mb-2 block text-sm font-bold"
              >
                Nome da promoção *
              </label>

              <input
                id="titulo"
                type="text"
                value={titulo}
                onChange={(e) => setTitulo(e.target.value)}
                placeholder="Ex.: Oferta especial do Bruxo"
                maxLength={100}
                required
                disabled={salvando}
                className="w-full rounded-xl border border-purple-500/20 bg-[#100719] px-4 py-4 text-sm text-white outline-none transition placeholder:text-gray-600 focus:border-purple-500"
              />

            </div>

            {/* DESCRIÇÃO */}

            <div>

              <label
                htmlFor="descricao"
                className="mb-2 block text-sm font-bold"
              >
                Descrição
              </label>

              <textarea
                id="descricao"
                value={descricao}
                onChange={(e) => setDescricao(e.target.value)}
                placeholder="Descreva os detalhes desta promoção..."
                rows={4}
                maxLength={500}
                disabled={salvando}
                className="w-full resize-none rounded-xl border border-purple-500/20 bg-[#100719] px-4 py-4 text-sm text-white outline-none transition placeholder:text-gray-600 focus:border-purple-500"
              />

            </div>

            {/* DESCONTO */}

            <div>

              <label
                htmlFor="desconto"
                className="mb-2 block text-sm font-bold"
              >
                Desconto (%) *
              </label>

              <div className="relative">

                <input
                  id="desconto"
                  type="number"
                  min="0.01"
                  max="100"
                  step="0.01"
                  value={desconto}
                  onChange={(e) => setDesconto(e.target.value)}
                  placeholder="Ex.: 10"
                  required
                  disabled={salvando}
                  className="w-full rounded-xl border border-purple-500/20 bg-[#100719] px-4 py-4 pr-12 text-sm text-white outline-none transition placeholder:text-gray-600 focus:border-purple-500"
                />

                <span className="absolute right-5 top-1/2 -translate-y-1/2 font-black text-purple-400">
                  %
                </span>

              </div>

              <p className="mt-2 text-xs text-gray-500">
                Informe a porcentagem de desconto.
              </p>

            </div>

            {/* INFORMAÇÃO */}

            <div className="rounded-xl border border-blue-500/20 bg-blue-500/5 p-4">

              <p className="text-xs leading-6 text-blue-200">

                ℹ️ A promoção será cadastrada como
                desativada. Você poderá ativá-la
                na lista de promoções abaixo.

              </p>

            </div>

            {/* SALVAR */}

            <button
              type="submit"
              disabled={salvando}
              className="w-full rounded-xl bg-purple-600 px-6 py-4 font-black text-white transition hover:bg-purple-500 disabled:cursor-not-allowed disabled:opacity-50"
            >

              {salvando
                ? "Salvando promoção..."
                : "+ Cadastrar promoção"}

            </button>

          </form>

        </section>

        {/* =====================================
            LISTA DE PROMOÇÕES
        ===================================== */}

        <section className="mt-14">

          <span className="text-xs font-bold uppercase tracking-[3px] text-purple-400">
            Suas ofertas
          </span>

          <h2 className="mt-3 text-2xl font-black sm:text-3xl">
            Promoções cadastradas
          </h2>

          <p className="mt-3 text-sm text-gray-400">
            Acompanhe e gerencie suas ofertas.
          </p>

          {/* CARREGAMENTO */}

          {carregandoPromocoes && (

            <div className="mt-8 rounded-2xl border border-purple-500/20 bg-[#1a1025] p-10 text-center">

              <p className="text-sm text-purple-300">
                Carregando promoções...
              </p>

            </div>

          )}

          {/* LISTA VAZIA */}

          {!carregandoPromocoes &&
            promocoes.length === 0 &&
            !erro && (

            <div className="mt-8 rounded-[28px] border border-purple-500/20 bg-[#1a1025] px-6 py-14 text-center">

              <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl bg-purple-600/10 text-4xl">

                🏷️

              </div>

              <h3 className="mt-7 text-xl font-black">
                Nenhuma promoção cadastrada
              </h3>

              <p className="mx-auto mt-4 max-w-sm text-sm leading-7 text-gray-400">

                Quando você cadastrar sua primeira
                promoção, ela aparecerá aqui
                para gerenciamento.

              </p>

            </div>

          )}

          {/* PROMOÇÕES */}

          <div className="mt-7 grid gap-5 lg:grid-cols-2">

            {promocoes.map((promocao) => (

              <article
                key={promocao.id}
                className="overflow-hidden rounded-[25px] border border-purple-500/20 bg-[#1a1025]"
              >

                {/* CONTEÚDO */}

                <div className="p-6">

                  {/* STATUS */}

                  <div className="flex flex-wrap items-center justify-between gap-3">

                    <span
                      className={`rounded-full border px-4 py-2 text-[10px] font-black uppercase tracking-[2px] ${
                        promocao.ativa
                          ? "border-green-500/30 bg-green-500/10 text-green-400"
                          : "border-yellow-500/30 bg-yellow-500/10 text-yellow-400"
                      }`}
                    >

                      {promocao.ativa
                        ? "● Ativa"
                        : "● Desativada"}

                    </span>

                    <span className="text-xs text-gray-500">
                      Barra de Açaí
                    </span>

                  </div>

                  {/* TÍTULO */}

                  <h3 className="mt-7 break-words text-xl font-black sm:text-2xl">

                    {promocao.titulo}

                  </h3>

                  {/* DESCRIÇÃO */}

                  <p className="mt-4 whitespace-pre-wrap break-words text-sm leading-7 text-gray-400">

                    {promocao.descricao ||
                      "Promoção especial para parceiros."}

                  </p>

                  {/* DESCONTO */}

                  <div className="mt-7 rounded-2xl border border-purple-500/20 bg-[#100719] p-5">

                    <span className="text-xs font-bold uppercase tracking-[2px] text-purple-300">

                      Desconto cadastrado

                    </span>

                    <p className="mt-3 text-4xl font-black text-green-400">

                      {promocao.desconto.toLocaleString(
                        "pt-BR"
                      )}%

                    </p>

                    <p className="mt-2 text-xs text-gray-500">
                      Desconto percentual
                    </p>

                  </div>

                </div>

                {/* BOTÕES */}

                <div className="grid grid-cols-2 gap-3 border-t border-purple-500/20 p-5">

                  {/* ATIVAR / DESATIVAR */}

                  <button
                    type="button"
                    onClick={() =>
                      alterarStatus(promocao)
                    }
                    className={`rounded-xl px-4 py-4 text-xs font-black transition sm:text-sm ${
                      promocao.ativa
                        ? "border border-yellow-500/30 bg-yellow-500/10 text-yellow-300 hover:bg-yellow-500/20"
                        : "bg-green-600 text-white hover:bg-green-500"
                    }`}
                  >

                    {promocao.ativa
                      ? "Desativar"
                      : "Ativar promoção"}

                  </button>

                  {/* EXCLUIR */}

                  <button
                    type="button"
                    onClick={() =>
                      excluirPromocao(promocao)
                    }
                    className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-4 text-xs font-black text-red-300 transition hover:bg-red-500/20 sm:text-sm"
                  >

                    Excluir

                  </button>

                </div>

              </article>

            ))}

          </div>

        </section>

        {/* =====================================
            VOLTAR PARA DASHBOARD
        ===================================== */}

        <div className="mt-14 text-center">

          <Link
            href="/admin/dashboard"
            className="inline-flex items-center justify-center rounded-xl border border-purple-500/30 px-8 py-4 text-sm font-bold text-purple-300 transition hover:bg-purple-600/10"
          >

            ← Voltar para o painel

          </Link>

        </div>

      </div>

      {/* =====================================
          RODAPÉ
      ===================================== */}

      <footer className="border-t border-purple-500/20 bg-black px-5 py-10 text-center">

        <h2 className="text-lg font-black">

          AÇAÍ DO{" "}

          <span className="text-purple-400">
            BRUXO
          </span>

        </h2>

        <p className="mt-2 text-[10px] uppercase tracking-[2px] text-purple-300">

          Central administrativa

        </p>

        <p className="mt-6 text-xs text-gray-600">

          © {new Date().getFullYear()} Açaí do Bruxo.

        </p>

      </footer>

    </main>
  );
}