"use client";

import Link from "next/link";
import {
  useEffect,
  useMemo,
  useState,
} from "react";

import { useRouter } from "next/navigation";

import {
  onAuthStateChanged,
  signOut,
  User,
} from "firebase/auth";

import {
  collection,
  doc,
  getDoc,
  onSnapshot,
  Timestamp,
  updateDoc,
} from "firebase/firestore";

import { auth, db } from "../../firebase/config";

// ==========================================
// TIPOS
// ==========================================

type StatusParceiro =
  | "pendente"
  | "aprovado"
  | "rejeitado";

type Parceiro = {
  id: string;
  nome: string;
  empresa: string;
  email: string;
  telefone: string;
  status: StatusParceiro;
  criadoEm?: Timestamp;
};

type Filtro =
  | "todos"
  | "pendente"
  | "aprovado"
  | "rejeitado";

// ==========================================
// FUNÇÕES AUXILIARES
// ==========================================

function normalizarStatus(
  status: unknown
): StatusParceiro {
  if (status === "aprovado") {
    return "aprovado";
  }

  if (status === "rejeitado") {
    return "rejeitado";
  }

  return "pendente";
}

function formatarData(
  data?: Timestamp
) {
  if (
    !data ||
    typeof data.toDate !== "function"
  ) {
    return "Data não informada";
  }

  return data
    .toDate()
    .toLocaleString("pt-BR");
}

function formatarTelefone(
  telefone: string
) {
  const numeros =
    telefone.replace(/\D/g, "");

  if (numeros.length === 11) {
    return numeros.replace(
      /(\d{2})(\d{5})(\d{4})/,
      "($1) $2-$3"
    );
  }

  return telefone || "Não informado";
}

function nomeStatus(
  status: StatusParceiro
) {
  if (status === "aprovado") {
    return "Parceiro aprovado";
  }

  if (status === "rejeitado") {
    return "Solicitação rejeitada";
  }

  return "Aguardando aprovação";
}

function classeStatus(
  status: StatusParceiro
) {
  if (status === "aprovado") {
    return `
      border-green-500/30
      bg-green-500/10
      text-green-300
    `;
  }

  if (status === "rejeitado") {
    return `
      border-red-500/30
      bg-red-500/10
      text-red-300
    `;
  }

  return `
    border-yellow-500/30
    bg-yellow-500/10
    text-yellow-300
  `;
}

// ==========================================
// PÁGINA
// ==========================================

export default function AdminStatusPage() {
  const router = useRouter();

  // ========================================
  // ESTADOS
  // ========================================

  const [
    usuarioAdmin,
    setUsuarioAdmin,
  ] = useState<User | null>(null);

  const [
    carregando,
    setCarregando,
  ] = useState(true);

  const [
    autorizado,
    setAutorizado,
  ] = useState(false);

  const [
    parceiros,
    setParceiros,
  ] = useState<Parceiro[]>([]);

  const [
    busca,
    setBusca,
  ] = useState("");

  const [
    filtro,
    setFiltro,
  ] = useState<Filtro>("todos");

  const [
    detalhesAbertos,
    setDetalhesAbertos,
  ] = useState<string | null>(
    null
  );

  const [
    processando,
    setProcessando,
  ] = useState<string | null>(
    null
  );

  const [
    erro,
    setErro,
  ] = useState("");

  const [
    sucesso,
    setSucesso,
  ] = useState("");

  // ========================================
  // VERIFICAR ADMIN
  // ========================================

  async function verificarAdmin(
    usuario: User
  ) {
    const adminRef = doc(
      db,
      "admins",
      usuario.uid
    );

    const adminSnapshot =
      await getDoc(adminRef);

    if (!adminSnapshot.exists()) {
      return false;
    }

    const dados =
      adminSnapshot.data();

    return (
      dados.role === "admin" &&
      dados.ativo === true
    );
  }

  // ========================================
  // AUTENTICAÇÃO
  // ========================================

  useEffect(() => {
    let paginaAtiva = true;

    let cancelarParceiros:
      (() => void) | undefined;

    const cancelarAuth =
      onAuthStateChanged(
        auth,

        async (usuario) => {
          cancelarParceiros?.();

          cancelarParceiros =
            undefined;

          if (!paginaAtiva) {
            return;
          }

          setCarregando(true);
          setErro("");
          setAutorizado(false);

          // NÃO LOGADO

          if (!usuario) {
            router.replace(
              "/admin/login"
            );

            return;
          }

          try {
            const adminValido =
              await verificarAdmin(
                usuario
              );

            if (!paginaAtiva) {
              return;
            }

            if (!adminValido) {
              await signOut(auth);

              router.replace(
                "/admin/login"
              );

              return;
            }

            // ADMIN AUTORIZADO

            setUsuarioAdmin(usuario);
            setAutorizado(true);

            // ==================================
            // ESCUTAR PARCEIROS
            // ==================================

            cancelarParceiros =
              onSnapshot(
                collection(
                  db,
                  "parceiros"
                ),

                (snapshot) => {
                  if (!paginaAtiva) {
                    return;
                  }

                  const lista =
                    snapshot.docs.map(
                      (documento) => {
                        const dados =
                          documento.data();

                        return {
                          id:
                            documento.id,

                          nome:
                            dados.nome ||
                            "Nome não informado",

                          empresa:
                            dados.empresa ||
                            "Empresa não informada",

                          email:
                            dados.email ||
                            "E-mail não informado",

                          telefone:
                            dados.telefone ||
                            "",

                          status:
                            normalizarStatus(
                              dados.status
                            ),

                          criadoEm:
                            dados.criadoEm,
                        };
                      }
                    ) as Parceiro[];

                  // PENDENTES PRIMEIRO

                  lista.sort(
                    (a, b) => {
                      const prioridade = {
                        pendente: 0,
                        aprovado: 1,
                        rejeitado: 2,
                      };

                      const diferenca =
                        prioridade[
                          a.status
                        ] -
                        prioridade[
                          b.status
                        ];

                      if (
                        diferenca !== 0
                      ) {
                        return diferenca;
                      }

                      const dataA =
                        a.criadoEm
                          ?.toMillis?.() ??
                        0;

                      const dataB =
                        b.criadoEm
                          ?.toMillis?.() ??
                        0;

                      return dataB - dataA;
                    }
                  );

                  setParceiros(lista);
                  setCarregando(false);
                  setErro("");
                },

                (error) => {
                  console.error(
                    "Erro ao carregar parceiros:",
                    error
                  );

                  if (paginaAtiva) {
                    setErro(
                      "Não foi possível carregar os parceiros. Verifique as permissões do Firestore."
                    );

                    setCarregando(
                      false
                    );
                  }
                }
              );
          } catch (error) {
            console.error(
              "Erro ao verificar administrador:",
              error
            );

            if (paginaAtiva) {
              setErro(
                "Não foi possível verificar sua conta administrativa."
              );

              setCarregando(false);
            }
          }
        }
      );

    return () => {
      paginaAtiva = false;

      cancelarAuth();

      cancelarParceiros?.();
    };
  }, [router]);

  // ========================================
  // ALTERAR STATUS
  // ========================================

  async function alterarStatus(
    parceiro: Parceiro,
    novoStatus:
      | "aprovado"
      | "rejeitado"
  ) {
    if (processando) {
      return;
    }

    setErro("");
    setSucesso("");

    // ======================================
    // VALIDAR ADMIN LOGADO
    // ======================================

    const usuario =
      auth.currentUser;

    if (!usuario) {
      setErro(
        "Sua sessão expirou. Faça login novamente."
      );

      router.replace(
        "/admin/login"
      );

      return;
    }

    setProcessando(
      parceiro.id
    );

    try {
      // ====================================
      // CONFIRMAR ADMIN NOVAMENTE
      // ====================================

      const adminValido =
        await verificarAdmin(
          usuario
        );

      if (!adminValido) {
        throw new Error(
          "ADMIN_NAO_AUTORIZADO"
        );
      }

      // ====================================
      // BUSCAR DOCUMENTO ATUAL
      // ====================================

      const parceiroRef = doc(
        db,
        "parceiros",
        parceiro.id
      );

      const parceiroSnapshot =
        await getDoc(parceiroRef);

      if (
        !parceiroSnapshot.exists()
      ) {
        throw new Error(
          "PARCEIRO_NAO_ENCONTRADO"
        );
      }

      const dadosAtuais =
        parceiroSnapshot.data();

      // ====================================
      // SOMENTE PENDENTE PODE SER ALTERADO
      // ====================================

      if (
        dadosAtuais.status !==
        "pendente"
      ) {
        setErro(
          `Este cadastro não está mais pendente. Status atual: ${
            dadosAtuais.status ||
            "não informado"
          }.`
        );

        return;
      }

      // ====================================
      // FIRESTORE
      // SOMENTE STATUS É ALTERADO
      // ====================================

      await updateDoc(
        parceiroRef,
        {
          status: novoStatus,
        }
      );

      // ====================================
      // SUCESSO
      // ====================================

      if (
        novoStatus ===
        "aprovado"
      ) {
        setSucesso(
          `${parceiro.empresa} foi aprovado com sucesso. O parceiro já está liberado para fazer login e acessar o portal.`
        );
      } else {
        setSucesso(
          `A solicitação de ${parceiro.empresa} foi rejeitada.`
        );
      }

      setDetalhesAbertos(null);

    } catch (error: unknown) {
      console.error(
        "Erro ao atualizar parceiro:",
        error
      );

      let codigo = "";

      if (
        typeof error === "object" &&
        error !== null &&
        "code" in error
      ) {
        codigo = String(
          error.code
        );
      }

      if (
        error instanceof Error &&
        error.message ===
          "ADMIN_NAO_AUTORIZADO"
      ) {
        setErro(
          "Sua conta não possui autorização administrativa."
        );

        return;
      }

      if (
        error instanceof Error &&
        error.message ===
          "PARCEIRO_NAO_ENCONTRADO"
      ) {
        setErro(
          "O cadastro deste parceiro não foi encontrado."
        );

        return;
      }

      if (
        codigo ===
        "permission-denied"
      ) {
        setErro(
          "O Firebase bloqueou esta alteração. A página está enviando somente o campo status; portanto, verifique se as regras do Firestore foram publicadas e se sua conta continua cadastrada na coleção admins."
        );

        return;
      }

      setErro(
        "Não foi possível atualizar o parceiro. Tente novamente."
      );
    } finally {
      setProcessando(null);
    }
  }

  // ========================================
  // APROVAR
  // ========================================

  async function aprovarParceiro(
    parceiro: Parceiro
  ) {
    if (
      parceiro.status !==
      "pendente"
    ) {
      return;
    }

    const confirmar =
      window.confirm(
        `Deseja APROVAR o cadastro da empresa "${parceiro.empresa}"?\n\nApós a aprovação, este parceiro poderá acessar o portal e realizar pedidos.`
      );

    if (!confirmar) {
      return;
    }

    await alterarStatus(
      parceiro,
      "aprovado"
    );
  }

  // ========================================
  // REJEITAR
  // ========================================

  async function rejeitarParceiro(
    parceiro: Parceiro
  ) {
    if (
      parceiro.status !==
      "pendente"
    ) {
      return;
    }

    const confirmar =
      window.confirm(
        `Deseja REJEITAR o cadastro da empresa "${parceiro.empresa}"?\n\nO parceiro não terá acesso ao portal.`
      );

    if (!confirmar) {
      return;
    }

    await alterarStatus(
      parceiro,
      "rejeitado"
    );
  }

  // ========================================
  // LOGOUT
  // ========================================

  async function sair() {
    try {
      await signOut(auth);

      router.replace(
        "/admin/login"
      );
    } catch (error) {
      console.error(
        "Erro ao sair:",
        error
      );

      setErro(
        "Não foi possível sair da conta."
      );
    }
  }

  // ========================================
  // CONTADORES
  // ========================================

  const total =
    parceiros.length;

  const pendentes =
    parceiros.filter(
      (parceiro) =>
        parceiro.status ===
        "pendente"
    ).length;

  const aprovados =
    parceiros.filter(
      (parceiro) =>
        parceiro.status ===
        "aprovado"
    ).length;

  const rejeitados =
    parceiros.filter(
      (parceiro) =>
        parceiro.status ===
        "rejeitado"
    ).length;

  // ========================================
  // FILTRAR
  // ========================================

  const parceirosFiltrados =
    useMemo(() => {
      const termo =
        busca
          .trim()
          .toLowerCase();

      return parceiros.filter(
        (parceiro) => {
          const statusOk =
            filtro === "todos" ||
            parceiro.status ===
              filtro;

          const buscaOk =
            !termo ||
            [
              parceiro.nome,
              parceiro.empresa,
              parceiro.email,
              parceiro.telefone,
            ].some((valor) =>
              valor
                .toLowerCase()
                .includes(termo)
            );

          return (
            statusOk &&
            buscaOk
          );
        }
      );
    }, [
      parceiros,
      busca,
      filtro,
    ]);

  // ========================================
  // CARREGANDO
  // ========================================

  if (carregando) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-5 bg-[#07040d] text-white">

        <div className="flex h-20 w-20 items-center justify-center rounded-3xl border border-purple-500/30 bg-purple-500/10 text-4xl">
          🧙‍♂️
        </div>

        <div className="h-10 w-10 animate-spin rounded-full border-4 border-purple-500/20 border-t-purple-500" />

        <p className="text-sm text-purple-300">
          Carregando empresas...
        </p>

      </main>
    );
  }

  // ========================================
  // NÃO AUTORIZADO
  // ========================================

  if (!autorizado) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#07040d] px-6 text-center text-white">

        <div className="max-w-md">

          <div className="text-5xl">
            🔒
          </div>

          <h1 className="mt-6 text-2xl font-black">
            Acesso restrito
          </h1>

          <p className="mt-4 text-sm leading-7 text-gray-400">

            {erro ||
              "Esta área é exclusiva do administrador."}

          </p>

          <Link
            href="/admin/login"
            className="mt-7 inline-block rounded-xl bg-purple-600 px-7 py-4 font-bold transition hover:bg-purple-500"
          >
            Voltar ao login
          </Link>

        </div>

      </main>
    );
  }

  // ========================================
  // INTERFACE
  // ========================================

  return (
    <main className="min-h-screen overflow-x-hidden bg-[#07040d] text-white">

      {/* =====================================
          HEADER
      ===================================== */}

      <header className="sticky top-0 z-50 border-b border-purple-500/20 bg-black/95 backdrop-blur-xl">

        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-4 sm:px-6">

          <Link
            href="/admin/dashboard"
            className="flex min-w-0 items-center gap-3"
          >

            <span className="text-xl text-purple-400">
              ←
            </span>

            <div>

              <h1 className="text-base font-black sm:text-xl">
                EMPRESAS
              </h1>

              <p className="text-[8px] font-bold uppercase tracking-[2px] text-purple-300">
                Açaí do Bruxo • Admin
              </p>

            </div>

          </Link>

          <button
            type="button"
            onClick={sair}
            className="shrink-0 rounded-xl border border-red-500/30 px-4 py-3 text-xs font-bold text-red-300 transition hover:bg-red-500/10"
          >
            Sair
          </button>

        </div>

      </header>

      {/* =====================================
          CONTEÚDO
      ===================================== */}

      <div className="mx-auto max-w-7xl px-4 pb-20 pt-8 sm:px-6">

        {/* HERO */}

        <section className="relative overflow-hidden rounded-[30px] border border-purple-500/20 bg-gradient-to-br from-[#271039] via-[#160b22] to-[#08040d] p-6 sm:p-10">

          <div className="pointer-events-none absolute -right-20 -top-20 h-72 w-72 rounded-full bg-purple-600/20 blur-[100px]" />

          <div className="pointer-events-none absolute -bottom-24 -left-20 h-64 w-64 rounded-full bg-fuchsia-600/10 blur-[100px]" />

          <div className="relative">

            <span className="inline-flex rounded-full border border-purple-500/30 bg-purple-500/10 px-4 py-2 text-[10px] font-black uppercase tracking-[2px] text-purple-300">
              Central de parceiros
            </span>

            <h2 className="mt-6 text-3xl font-black leading-tight sm:text-5xl">

              CONTROLE SUA
              <br />

              <span className="bg-gradient-to-r from-purple-300 via-fuchsia-400 to-blue-400 bg-clip-text text-transparent">
                REDE DE PARCEIROS.
              </span>

            </h2>

            <p className="mt-5 max-w-2xl text-sm leading-7 text-gray-400 sm:text-base">

              Analise novas solicitações,
              aprove parceiros e acompanhe
              as empresas autorizadas a
              realizar pedidos.

            </p>

          </div>

        </section>

        {/* ADMIN ATUAL */}

        {usuarioAdmin && (

          <div className="mt-5 rounded-2xl border border-blue-500/20 bg-blue-500/5 px-5 py-4">

            <p className="text-[10px] font-black uppercase tracking-[2px] text-blue-300">
              Administrador conectado
            </p>

            <p className="mt-1 break-all text-xs text-gray-400">
              {usuarioAdmin.email}
            </p>

          </div>

        )}

        {/* ERRO */}

        {erro && (

          <div
            role="alert"
            className="mt-6 rounded-2xl border border-red-500/30 bg-red-500/10 p-5 text-sm leading-7 text-red-300"
          >
            ⚠️ {erro}
          </div>

        )}

        {/* SUCESSO */}

        {sucesso && (

          <div
            role="status"
            className="mt-6 rounded-2xl border border-green-500/30 bg-green-500/10 p-5 text-sm leading-7 text-green-300"
          >
            ✅ {sucesso}
          </div>

        )}

        {/* =====================================
            RESUMO
        ===================================== */}

        <section className="mt-10">

          <div className="flex flex-wrap items-end justify-between gap-4">

            <div>

              <span className="text-[10px] font-black uppercase tracking-[3px] text-purple-400">
                Visão geral
              </span>

              <h2 className="mt-2 text-2xl font-black sm:text-3xl">
                Resumo das empresas
              </h2>

            </div>

            {pendentes > 0 && (

              <button
                type="button"
                onClick={() =>
                  setFiltro(
                    "pendente"
                  )
                }
                className="rounded-full border border-yellow-500/30 bg-yellow-500/10 px-4 py-2 text-xs font-bold text-yellow-300"
              >
                🔔 {pendentes}{" "}
                {pendentes === 1
                  ? "pendente"
                  : "pendentes"}
              </button>

            )}

          </div>

          <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">

            {/* TOTAL */}

            <button
              type="button"
              onClick={() =>
                setFiltro("todos")
              }
              className="rounded-2xl border border-purple-500/20 bg-[#1b1026] p-5 text-left transition hover:border-purple-400/50"
            >

              <span className="text-2xl">
                🏪
              </span>

              <p className="mt-5 text-3xl font-black text-purple-400">
                {total}
              </p>

              <p className="mt-2 text-xs text-gray-400">
                Total de empresas
              </p>

            </button>

            {/* PENDENTES */}

            <button
              type="button"
              onClick={() =>
                setFiltro(
                  "pendente"
                )
              }
              className="rounded-2xl border border-yellow-500/20 bg-[#1b1026] p-5 text-left transition hover:border-yellow-400/50"
            >

              <span className="text-2xl">
                ⏳
              </span>

              <p className="mt-5 text-3xl font-black text-yellow-400">
                {pendentes}
              </p>

              <p className="mt-2 text-xs text-gray-400">
                Aguardando análise
              </p>

            </button>

            {/* APROVADOS */}

            <button
              type="button"
              onClick={() =>
                setFiltro(
                  "aprovado"
                )
              }
              className="rounded-2xl border border-green-500/20 bg-[#1b1026] p-5 text-left transition hover:border-green-400/50"
            >

              <span className="text-2xl">
                ✅
              </span>

              <p className="mt-5 text-3xl font-black text-green-400">
                {aprovados}
              </p>

              <p className="mt-2 text-xs text-gray-400">
                Parceiros aprovados
              </p>

            </button>

            {/* REJEITADOS */}

            <button
              type="button"
              onClick={() =>
                setFiltro(
                  "rejeitado"
                )
              }
              className="rounded-2xl border border-red-500/20 bg-[#1b1026] p-5 text-left transition hover:border-red-400/50"
            >

              <span className="text-2xl">
                🚫
              </span>

              <p className="mt-5 text-3xl font-black text-red-400">
                {rejeitados}
              </p>

              <p className="mt-2 text-xs text-gray-400">
                Rejeitados
              </p>

            </button>

          </div>

        </section>

        {/* =====================================
            EMPRESAS
        ===================================== */}

        <section className="mt-12">

          <span className="text-[10px] font-black uppercase tracking-[3px] text-purple-400">
            Gerenciamento
          </span>

          <h2 className="mt-2 text-2xl font-black sm:text-3xl">
            Empresas cadastradas
          </h2>

          <p className="mt-2 text-sm text-gray-400">
            Consulte os dados e libere o acesso dos parceiros.
          </p>

          {/* BUSCA */}

          <div className="relative mt-7">

            <span className="pointer-events-none absolute left-5 top-1/2 -translate-y-1/2 text-gray-500">
              🔎
            </span>

            <input
              type="search"
              value={busca}
              onChange={(evento) =>
                setBusca(
                  evento.target.value
                )
              }
              placeholder="Buscar empresa, parceiro ou e-mail..."
              className="w-full rounded-xl border border-purple-500/20 bg-[#1b1026] py-4 pl-12 pr-5 text-sm text-white outline-none placeholder:text-gray-500 focus:border-purple-500"
            />

          </div>

          {/* FILTROS */}

          <div className="mt-5 flex gap-2 overflow-x-auto pb-2">

            {[
              {
                valor: "todos",
                texto: `Todas (${total})`,
              },
              {
                valor:
                  "pendente",
                texto:
                  `Pendentes (${pendentes})`,
              },
              {
                valor:
                  "aprovado",
                texto:
                  `Aprovadas (${aprovados})`,
              },
              {
                valor:
                  "rejeitado",
                texto:
                  `Rejeitadas (${rejeitados})`,
              },
            ].map(
              (item) => (

                <button
                  key={
                    item.valor
                  }
                  type="button"
                  onClick={() =>
                    setFiltro(
                      item.valor as Filtro
                    )
                  }
                  className={`shrink-0 rounded-xl border px-4 py-3 text-xs font-bold transition ${
                    filtro ===
                    item.valor
                      ? "border-purple-500 bg-purple-600 text-white"
                      : "border-purple-500/20 bg-[#1b1026] text-gray-400 hover:text-white"
                  }`}
                >
                  {item.texto}
                </button>

              )
            )}

          </div>

          {/* SEM RESULTADOS */}

          {parceirosFiltrados.length ===
            0 && (

            <div className="mt-7 rounded-[28px] border border-purple-500/20 bg-[#1b1026] px-6 py-16 text-center">

              <div className="text-5xl">
                🏪
              </div>

              <h3 className="mt-6 text-xl font-black">
                Nenhuma empresa encontrada
              </h3>

              <p className="mt-3 text-sm text-gray-400">
                Não encontramos parceiros para este filtro.
              </p>

            </div>

          )}

          {/* CARDS */}

          <div className="mt-7 space-y-5">

            {parceirosFiltrados.map(
              (parceiro) => {

                const aberto =
                  detalhesAbertos ===
                  parceiro.id;

                const ocupado =
                  processando ===
                  parceiro.id;

                return (

                  <article
                    key={
                      parceiro.id
                    }
                    className="overflow-hidden rounded-[26px] border border-purple-500/20 bg-gradient-to-br from-[#21112f] to-[#130a1d]"
                  >

                    <div className="p-5 sm:p-7">

                      {/* CABEÇALHO */}

                      <div className="flex flex-wrap items-start justify-between gap-4">

                        <div className="min-w-0">

                          <span className="text-[9px] font-black uppercase tracking-[2px] text-purple-400">
                            Estabelecimento
                          </span>

                          <h3 className="mt-2 break-words text-xl font-black sm:text-2xl">

                            {
                              parceiro.empresa
                            }

                          </h3>

                          <p className="mt-2 text-sm text-gray-400">

                            {
                              parceiro.nome
                            }

                          </p>

                        </div>

                        <span
                          className={`rounded-full border px-4 py-2 text-[10px] font-bold ${classeStatus(
                            parceiro.status
                          )}`}
                        >
                          {nomeStatus(
                            parceiro.status
                          )}
                        </span>

                      </div>

                      {/* INFO */}

                      <div className="mt-6 grid gap-4 border-t border-purple-500/15 pt-5 sm:grid-cols-2">

                        <div>

                          <p className="text-[10px] uppercase tracking-[2px] text-gray-500">
                            E-mail
                          </p>

                          <p className="mt-2 break-all text-sm font-semibold text-gray-200">

                            {
                              parceiro.email
                            }

                          </p>

                        </div>

                        <div>

                          <p className="text-[10px] uppercase tracking-[2px] text-gray-500">
                            Cadastro realizado
                          </p>

                          <p className="mt-2 text-sm font-semibold text-gray-200">

                            {formatarData(
                              parceiro.criadoEm
                            )}

                          </p>

                        </div>

                      </div>

                      {/* DETALHES */}

                      <button
                        type="button"
                        onClick={() =>
                          setDetalhesAbertos(
                            aberto
                              ? null
                              : parceiro.id
                          )
                        }
                        className="mt-6 flex w-full items-center justify-between rounded-xl border border-purple-500/20 bg-purple-500/10 px-5 py-4 text-left text-sm font-bold text-purple-300 transition hover:bg-purple-500/20"
                      >

                        <span>

                          {aberto
                            ? "Ocultar informações"
                            : "Ver informações completas"}

                        </span>

                        <span>
                          {aberto
                            ? "↑"
                            : "↓"}
                        </span>

                      </button>

                      {/* DADOS COMPLETOS */}

                      {aberto && (

                        <div className="mt-4 rounded-2xl border border-purple-500/15 bg-black/20 p-5">

                          <div className="space-y-5 text-sm">

                            <div>

                              <p className="text-[10px] uppercase tracking-[2px] text-gray-500">
                                Responsável
                              </p>

                              <p className="mt-1 font-bold">
                                {parceiro.nome}
                              </p>

                            </div>

                            <div>

                              <p className="text-[10px] uppercase tracking-[2px] text-gray-500">
                                Empresa
                              </p>

                              <p className="mt-1 font-bold">
                                {parceiro.empresa}
                              </p>

                            </div>

                            <div>

                              <p className="text-[10px] uppercase tracking-[2px] text-gray-500">
                                Telefone
                              </p>

                              <p className="mt-1 font-bold">

                                {formatarTelefone(
                                  parceiro.telefone
                                )}

                              </p>

                            </div>

                            <div>

                              <p className="text-[10px] uppercase tracking-[2px] text-gray-500">
                                E-mail
                              </p>

                              <p className="mt-1 break-all font-bold">
                                {parceiro.email}
                              </p>

                            </div>

                            <div>

                              <p className="text-[10px] uppercase tracking-[2px] text-gray-500">
                                UID
                              </p>

                              <p className="mt-1 break-all font-mono text-xs text-gray-400">
                                {parceiro.id}
                              </p>

                            </div>

                          </div>

                        </div>

                      )}

                      {/* ===================================
                          PENDENTE
                      =================================== */}

                      {parceiro.status ===
                        "pendente" && (

                        <div className="mt-6 grid gap-3 sm:grid-cols-2">

                          <button
                            type="button"
                            disabled={
                              ocupado
                            }
                            onClick={() =>
                              aprovarParceiro(
                                parceiro
                              )
                            }
                            className="rounded-xl bg-green-600 px-5 py-4 text-sm font-black text-white shadow-lg shadow-green-950/20 transition hover:-translate-y-0.5 hover:bg-green-500 disabled:cursor-not-allowed disabled:opacity-50"
                          >

                            {ocupado
                              ? "Processando..."
                              : "✓ Aprovar parceiro"}

                          </button>

                          <button
                            type="button"
                            disabled={
                              ocupado
                            }
                            onClick={() =>
                              rejeitarParceiro(
                                parceiro
                              )
                            }
                            className="rounded-xl bg-red-600 px-5 py-4 text-sm font-black text-white transition hover:-translate-y-0.5 hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-50"
                          >

                            {ocupado
                              ? "Processando..."
                              : "✕ Rejeitar solicitação"}

                          </button>

                        </div>

                      )}

                      {/* ===================================
                          APROVADO
                      =================================== */}

                      {parceiro.status ===
                        "aprovado" && (

                        <div className="mt-6 rounded-xl border border-green-500/20 bg-green-500/10 p-5">

                          <div className="flex items-start gap-3">

                            <span className="text-xl">
                              ✅
                            </span>

                            <div>

                              <p className="font-black text-green-400">
                                Acesso liberado
                              </p>

                              <p className="mt-2 text-sm leading-6 text-gray-400">

                                Este parceiro já pode entrar no portal utilizando o e-mail e a senha cadastrados.

                              </p>

                            </div>

                          </div>

                        </div>

                      )}

                      {/* ===================================
                          REJEITADO
                      =================================== */}

                      {parceiro.status ===
                        "rejeitado" && (

                        <div className="mt-6 rounded-xl border border-red-500/20 bg-red-500/10 p-5">

                          <p className="font-black text-red-400">
                            🚫 Solicitação rejeitada
                          </p>

                          <p className="mt-2 text-sm leading-6 text-gray-400">

                            Este cadastro não possui acesso ao portal de parceiros.

                          </p>

                        </div>

                      )}

                    </div>

                  </article>

                );
              }
            )}

          </div>

        </section>

      </div>

      {/* =====================================
          RODAPÉ
      ===================================== */}

      <footer className="border-t border-purple-500/10 bg-black px-5 py-10 text-center">

        <h2 className="text-xl font-black">

          AÇAÍ DO{" "}

          <span className="text-purple-400">
            BRUXO
          </span>

        </h2>

        <p className="mt-2 text-[9px] font-bold uppercase tracking-[2px] text-purple-300">
          Administração exclusiva
        </p>

        <p className="mt-6 text-xs text-gray-600">

          © {new Date().getFullYear()} Açaí do Bruxo.

        </p>

      </footer>

    </main>
  );
}