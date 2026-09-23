
"use client";

import Link from "next/link";
import Image from "next/image";

import {
  useEffect,
  useState,
} from "react";

import { useRouter } from "next/navigation";

import {
  onAuthStateChanged,
  signOut,
} from "firebase/auth";

import {
  collection,
  doc,
  getDoc,
  onSnapshot,
  runTransaction,
  serverTimestamp,
  Timestamp,
} from "firebase/firestore";

import { auth, db } from "../../firebase/config";

// ==========================================
// TIPOS
// ==========================================

type StatusPedido =
  | "novo"
  | "em_andamento"
  | "em_rota"
  | "entregue"
  | "cancelado";

type ItemPedido = {
  nome?: string;
  quantidade?: number;
  preco?: number;
};

type Localizacao = {
  latitude?: number;
  longitude?: number;
  precisaoMetros?: number;
};

type EnderecoPedido = {
  cep?: string;
  rua?: string;
  numero?: string;
  bairro?: string;
  cidade?: string;
  estado?: string;
  complemento?: string;
  referencia?: string;
  pontoDeReferencia?: string;

  latitude?: number;
  longitude?: number;

  localizacao?: Localizacao;
};

type Pedido = {
  id: string;

  parceiroId?: string;
  parceiroNome?: string;
  parceiroEmpresa?: string;
  parceiroEmail?: string;
  parceiroTelefone?: string;

  // Compatibilidade com pedidos antigos

  nomeParceiro?: string;
  empresa?: string;
  email?: string;
  telefone?: string;

  produto?: string;
  quantidade?: number;
  itens?: ItemPedido[];

  total?: number;
  valorPendente?: boolean;

  formaPagamento?: string;
  statusPagamento?: string;

  tipoEntrega?: string;
  endereco?: EnderecoPedido;

  localizacao?: Localizacao;

  observacao?: string;

  status: StatusPedido;

  criadoEm?: Timestamp;
  atualizadoEm?: Timestamp;

  iniciadoEm?: Timestamp;
  saiuParaEntregaEm?: Timestamp;
  entregueEm?: Timestamp;
  canceladoEm?: Timestamp;
};

type Aba =
  | "ativos"
  | "novos"
  | "preparacao"
  | "rota"
  | "concluidos"
  | "cancelados";

// ==========================================
// FUNÇÕES AUXILIARES
// ==========================================

function formatarMoeda(valor: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(valor);
}

function formatarData(data?: Timestamp) {
  if (!data || typeof data.toDate !== "function") {
    return "Não informado";
  }

  return data.toDate().toLocaleString("pt-BR");
}

function normalizarStatus(
  status: unknown
): StatusPedido {
  const permitidos: StatusPedido[] = [
    "novo",
    "em_andamento",
    "em_rota",
    "entregue",
    "cancelado",
  ];

  if (
    typeof status === "string" &&
    permitidos.includes(status as StatusPedido)
  ) {
    return status as StatusPedido;
  }

  return "novo";
}

function nomeStatus(status: StatusPedido) {
  const nomes: Record<StatusPedido, string> = {
    novo: "Novo pedido",
    em_andamento: "Em preparação",
    em_rota: "Em rota",
    entregue: "Entregue",
    cancelado: "Cancelado",
  };

  return nomes[status];
}

function corStatus(status: StatusPedido) {
  const cores: Record<StatusPedido, string> = {
    novo:
      "border-yellow-500/30 bg-yellow-500/10 text-yellow-300",

    em_andamento:
      "border-blue-500/30 bg-blue-500/10 text-blue-300",

    em_rota:
      "border-purple-500/30 bg-purple-500/10 text-purple-300",

    entregue:
      "border-green-500/30 bg-green-500/10 text-green-300",

    cancelado:
      "border-red-500/30 bg-red-500/10 text-red-300",
  };

  return cores[status];
}

// ==========================================
// LOCALIZAÇÃO DO PEDIDO
// ==========================================

function obterLocalizacao(
  pedido: Pedido
): Localizacao | null {

  const local =
    pedido.endereco?.localizacao ??
    pedido.localizacao ??
    pedido.endereco;

  if (!local) {
    return null;
  }

  const latitude = local.latitude;
  const longitude = local.longitude;

  if (
    typeof latitude !== "number" ||
    typeof longitude !== "number" ||
    !Number.isFinite(latitude) ||
    !Number.isFinite(longitude) ||
    latitude < -90 ||
    latitude > 90 ||
    longitude < -180 ||
    longitude > 180
  ) {
    return null;
  }

  const precisaoMetros =
    "precisaoMetros" in local &&
    typeof local.precisaoMetros === "number"
      ? local.precisaoMetros
      : undefined;

  return {
    latitude,
    longitude,
    precisaoMetros,
  };
}

// ==========================================
// LINK DO GOOGLE MAPS
// ==========================================

function linkGoogleMaps(
  pedido: Pedido
): string | null {
  const local = obterLocalizacao(pedido);

  if (!local) return null;

  return (
    "https://www.google.com/maps/dir/?api=1" +
    "&destination=" +
    encodeURIComponent(
      `${local.latitude},${local.longitude}`
    )
  );
}

// ==========================================
// ENDEREÇO FORMATADO
// ==========================================

function formatarEndereco(
  endereco?: EnderecoPedido
) {
  if (!endereco) {
    return "Endereço não informado";
  }

  return [
    [
      endereco.rua,
      endereco.numero,
    ]
      .filter(Boolean)
      .join(", "),

    endereco.bairro,

    [
      endereco.cidade,
      endereco.estado,
    ]
      .filter(Boolean)
      .join(" - "),

    endereco.cep
      ? `CEP: ${endereco.cep}`
      : "",
  ]
    .filter(Boolean)
    .join("\n");
}

// ==========================================
// PÁGINA ADMINISTRATIVA
// ==========================================

export default function AdminPedidosPage() {
  const router = useRouter();

  // ========================================
  // ESTADOS
  // ========================================

  const [carregando, setCarregando] =
    useState(true);

  const [autorizado, setAutorizado] =
    useState(false);

  const [pedidos, setPedidos] =
    useState<Pedido[]>([]);

  const [aba, setAba] =
    useState<Aba>("ativos");

  const [busca, setBusca] =
    useState("");

  const [erro, setErro] =
    useState("");

  const [sucesso, setSucesso] =
    useState("");

  const [pedidoAtualizando, setPedidoAtualizando] =
    useState<string | null>(null);

  const [pedidoAberto, setPedidoAberto] =
    useState<string | null>(null);

  // ========================================
  // AUTENTICAÇÃO ADMINISTRATIVA
  // ========================================

  useEffect(() => {
    let ativo = true;

    let cancelarPedidos:
      (() => void) | undefined;

    const cancelarAuth = onAuthStateChanged(
      auth,

      async (usuario) => {
        if (cancelarPedidos) {
          cancelarPedidos();
          cancelarPedidos = undefined;
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
          const adminRef = doc(
            db,
            "admins",
            usuario.uid
          );

          const adminSnapshot =
            await getDoc(adminRef);

          if (!ativo) return;

          // VERIFICAR PERMISSÃO

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

          // ADMIN AUTORIZADO

          setAutorizado(true);

          // MONITORAR PEDIDOS

          cancelarPedidos = onSnapshot(
            collection(db, "pedidos"),

            (snapshot) => {
              if (!ativo) return;

              const lista: Pedido[] =
                snapshot.docs.map((documento) => {
                  const dados = documento.data();

                  return {
                    ...dados,

                    id: documento.id,

                    status: normalizarStatus(
                      dados.status
                    ),
                  } as Pedido;
                });

              // PEDIDOS MAIS RECENTES PRIMEIRO

              lista.sort((a, b) => {
                const dataA =
                  a.criadoEm?.toMillis?.() ?? 0;

                const dataB =
                  b.criadoEm?.toMillis?.() ?? 0;

                return dataB - dataA;
              });

              setPedidos(lista);
              setErro("");
              setCarregando(false);
            },

            (error) => {
              console.error(
                "Erro ao consultar pedidos:",
                error
              );

              if (ativo) {
                setErro(
                  "Não foi possível carregar os pedidos. Verifique as permissões do Firestore."
                );

                setCarregando(false);
              }
            }
          );
        } catch (error) {
          console.error(
            "Erro na autorização:",
            error
          );

          if (ativo) {
            setErro(
              "Não foi possível verificar sua autorização administrativa."
            );

            setCarregando(false);
          }
        }
      }
    );

    return () => {
      ativo = false;

      cancelarAuth();

      if (cancelarPedidos) {
        cancelarPedidos();
      }
    };
  }, [router]);

  // ========================================
  // ATUALIZAR STATUS DO PEDIDO
  // ========================================

  async function atualizarStatus(
    pedido: Pedido,
    novoStatus: StatusPedido
  ) {
    if (!autorizado || pedidoAtualizando) {
      return;
    }

    // TRANSIÇÕES PERMITIDAS

    const transicoes: Record<
      StatusPedido,
      StatusPedido[]
    > = {
      novo: ["em_andamento", "cancelado"],

      em_andamento: ["em_rota", "cancelado"],

      em_rota: ["entregue"],

      entregue: [],

      cancelado: [],
    };

    if (
      !transicoes[pedido.status].includes(
        novoStatus
      )
    ) {
      setErro(
        "Esta mudança de status não é permitida."
      );

      return;
    }

    // CONFIRMAÇÃO

    const mensagens: Record<
      StatusPedido,
      string
    > = {
      novo: "Retornar para novo pedido?",

      em_andamento:
        "Deseja iniciar a preparação deste pedido?",

      em_rota:
        "Confirmar que a entrega será iniciada?",

      entregue:
        "O pedido foi realmente entregue ao parceiro?",

      cancelado:
        "Deseja realmente cancelar este pedido?",
    };

    const confirmar = window.confirm(
      mensagens[novoStatus]
    );

    if (!confirmar) return;

    setPedidoAtualizando(pedido.id);
    setErro("");
    setSucesso("");

    try {
      const pedidoRef = doc(
        db,
        "pedidos",
        pedido.id
      );

      // TRANSAÇÃO PARA EVITAR MUDANÇAS
      // SOBRE UM STATUS DESATUALIZADO

      await runTransaction(
        db,

        async (transacao) => {
          const snapshot =
            await transacao.get(pedidoRef);

          if (!snapshot.exists()) {
            throw new Error(
              "Este pedido não existe mais."
            );
          }

          const statusAtual =
            normalizarStatus(
              snapshot.data().status
            );

          if (
            !transicoes[statusAtual].includes(
              novoStatus
            )
          ) {
            throw new Error(
              "O status do pedido mudou. Atualize a página e tente novamente."
            );
          }

          const alteracoes: Record<
            string,
            unknown
          > = {
            status: novoStatus,

            atualizadoEm:
              serverTimestamp(),
          };

          // INÍCIO DA PREPARAÇÃO

          if (
            novoStatus === "em_andamento"
          ) {
            alteracoes.iniciadoEm =
              serverTimestamp();
          }

          // INÍCIO DA ENTREGA

          if (
            novoStatus === "em_rota"
          ) {
            alteracoes.saiuParaEntregaEm =
              serverTimestamp();
          }

          // ENTREGA CONCLUÍDA

          if (
            novoStatus === "entregue"
          ) {
            alteracoes.entregueEm =
              serverTimestamp();
          }

          // PEDIDO CANCELADO

          if (
            novoStatus === "cancelado"
          ) {
            alteracoes.canceladoEm =
              serverTimestamp();
          }

          transacao.update(
            pedidoRef,
            alteracoes
          );
        }
      );

      setSucesso(
        `Pedido atualizado para: ${nomeStatus(
          novoStatus
        )}.`
      );

      // AO CONCLUIR, MUDAR PARA O HISTÓRICO

      if (novoStatus === "entregue") {
        setAba("concluidos");
        setPedidoAberto(null);
      }

      if (novoStatus === "cancelado") {
        setAba("cancelados");
        setPedidoAberto(null);
      }
    } catch (error) {
      console.error(
        "Erro ao atualizar pedido:",
        error
      );

      setErro(
        error instanceof Error &&
        !error.message.includes(
          "Missing or insufficient permissions"
        )
          ? error.message
          : "Não foi possível atualizar o pedido. Verifique as permissões do Firestore."
      );
    } finally {
      setPedidoAtualizando(null);
    }
  }

  // ========================================
  // INDICADORES
  // ========================================

  const total = pedidos.length;

  const novos = pedidos.filter(
    (pedido) => pedido.status === "novo"
  ).length;

  const preparacao = pedidos.filter(
    (pedido) =>
      pedido.status === "em_andamento"
  ).length;

  const emRota = pedidos.filter(
    (pedido) =>
      pedido.status === "em_rota"
  ).length;

  const entregues = pedidos.filter(
    (pedido) =>
      pedido.status === "entregue"
  ).length;

  const ativos =
    novos + preparacao + emRota;

  // ========================================
  // FILTRAR PEDIDOS
  // ========================================

  const pedidosFiltrados = pedidos.filter(
    (pedido) => {
      let correspondeAba = false;

      switch (aba) {
        case "ativos":
          correspondeAba = [
            "novo",
            "em_andamento",
            "em_rota",
          ].includes(pedido.status);

          break;

        case "novos":
          correspondeAba =
            pedido.status === "novo";

          break;

        case "preparacao":
          correspondeAba =
            pedido.status === "em_andamento";

          break;

        case "rota":
          correspondeAba =
            pedido.status === "em_rota";

          break;

        case "concluidos":
          correspondeAba =
            pedido.status === "entregue";

          break;

        case "cancelados":
          correspondeAba =
            pedido.status === "cancelado";

          break;
      }

      const texto =
        busca.trim().toLowerCase();

      const correspondeBusca =
        !texto ||
        [
          pedido.id,

          pedido.parceiroNome,
          pedido.parceiroEmpresa,
          pedido.parceiroEmail,
          pedido.parceiroTelefone,

          pedido.nomeParceiro,
          pedido.empresa,
          pedido.email,
          pedido.telefone,

          pedido.endereco?.rua,
          pedido.endereco?.bairro,
          pedido.endereco?.cidade,
        ]
          .filter(Boolean)
          .some((valor) =>
            String(valor)
              .toLowerCase()
              .includes(texto)
          );

      return (
        correspondeAba &&
        correspondeBusca
      );
    }
  );

  // ========================================
  // CARREGAMENTO
  // ========================================

  if (carregando) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-5 bg-[#08050e] text-white">

        <Image
          src="/mago.png"
          alt="Açaí do Bruxo"
          width={150}
          height={180}
          priority
          className="h-32 w-auto object-contain"
        />

        <div className="h-10 w-10 animate-spin rounded-full border-4 border-purple-500/20 border-t-purple-500" />

        <p className="text-sm text-purple-300">
          Carregando central de pedidos...
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
          {erro ||
            "Esta área é exclusiva do administrador."}
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
    <main className="min-h-screen overflow-x-hidden bg-[#08050e] text-white">

      {/* =====================================
          CABEÇALHO
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

              <h1 className="text-lg font-black">
                PEDIDOS
              </h1>

              <p className="text-[9px] font-bold uppercase tracking-[2px] text-purple-300">
                Açaí do Bruxo • Admin
              </p>

            </div>

          </Link>

          <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-purple-500/20 bg-purple-500/10 text-xl">
            📦
          </div>

        </div>

      </header>

      {/* =====================================
          CONTEÚDO
      ===================================== */}

      <div className="mx-auto max-w-7xl px-4 pb-20 pt-8 sm:px-6">

        {/* APRESENTAÇÃO */}

        <section className="relative overflow-hidden rounded-[28px] border border-purple-500/20 bg-gradient-to-br from-[#251035] via-[#180d25] to-[#0d0714] p-6 sm:p-10">

          <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-purple-600/20 blur-[90px]" />

          <div className="relative">

            <span className="text-xs font-bold uppercase tracking-[3px] text-purple-400">
              Central de distribuição
            </span>

            <h2 className="mt-5 text-3xl font-black sm:text-5xl">

              CONTROLE
              <br />

              <span className="bg-gradient-to-r from-purple-300 via-fuchsia-400 to-blue-400 bg-clip-text text-transparent">
                SUAS ENTREGAS.
              </span>

            </h2>

            <p className="mt-5 max-w-xl text-sm leading-7 text-gray-400 sm:text-base">

              Receba pedidos, consulte endereços,
              inicie entregas e acompanhe os
              pedidos concluídos em um só lugar.

            </p>

          </div>

        </section>

        {/* =====================================
            AVISOS
        ===================================== */}

        {erro && (
          <div
            role="alert"
            className="mt-6 rounded-xl border border-red-500/30 bg-red-500/10 p-5 text-sm leading-7 text-red-300"
          >
            {erro}
          </div>
        )}

        {sucesso && (
          <div
            role="status"
            className="mt-6 rounded-xl border border-green-500/30 bg-green-500/10 p-5 text-sm leading-7 text-green-300"
          >
            ✓ {sucesso}
          </div>
        )}

        {/* =====================================
            INDICADORES
        ===================================== */}

        <section className="mt-10">

          <h2 className="mb-6 text-2xl font-black">
            Resumo dos pedidos
          </h2>

          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">

            {[
              {
                titulo: "Pedidos ativos",
                valor: ativos,
                icone: "📦",
                cor: "text-purple-400",
              },

              {
                titulo: "Novos pedidos",
                valor: novos,
                icone: "🔔",
                cor: "text-yellow-400",
              },

              {
                titulo: "Em rota",
                valor: emRota,
                icone: "🚚",
                cor: "text-blue-400",
              },

              {
                titulo: "Entregues",
                valor: entregues,
                icone: "✅",
                cor: "text-green-400",
              },
            ].map((item) => (

              <div
                key={item.titulo}
                className="rounded-2xl border border-purple-500/20 bg-[#1b1026] p-4 sm:p-6"
              >

                <div className="text-2xl">
                  {item.icone}
                </div>

                <p className={`mt-5 text-3xl font-black ${item.cor}`}>
                  {item.valor}
                </p>

                <p className="mt-2 text-xs leading-5 text-gray-400">
                  {item.titulo}
                </p>

              </div>

            ))}

          </div>

          <div className="mt-4 flex flex-wrap gap-4 text-xs text-gray-500">

            <span>
              Total geral: {total}
            </span>

            <span>
              Em preparação: {preparacao}
            </span>

          </div>

        </section>

        {/* =====================================
            LISTAGEM
        ===================================== */}

        <section className="mt-12">

          <h2 className="text-2xl font-black">
            Gerenciar pedidos
          </h2>

          <p className="mt-2 text-sm text-gray-400">
            Selecione uma categoria para consultar os pedidos.
          </p>

          {/* BUSCA */}

          <input
            type="search"
            value={busca}
            onChange={(e) =>
              setBusca(e.target.value)
            }
            placeholder="Buscar pedido ou estabelecimento..."
            className="mt-7 w-full rounded-xl border border-purple-500/20 bg-[#1b1026] px-5 py-4 text-sm text-white outline-none placeholder:text-gray-500 focus:border-purple-500"
          />

          {/* =====================================
              ABAS
          ===================================== */}

          <div className="mt-5 flex gap-2 overflow-x-auto pb-4">

            {[
              {
                valor: "ativos",
                titulo: `Ativos (${ativos})`,
              },

              {
                valor: "novos",
                titulo: `Novos (${novos})`,
              },

              {
                valor: "preparacao",
                titulo: `Preparação (${preparacao})`,
              },

              {
                valor: "rota",
                titulo: `Em rota (${emRota})`,
              },

              {
                valor: "concluidos",
                titulo: `Concluídos (${entregues})`,
              },

              {
                valor: "cancelados",
                titulo: "Cancelados",
              },
            ].map((item) => (

              <button
                key={item.valor}
                type="button"
                onClick={() =>
                  setAba(item.valor as Aba)
                }
                className={`shrink-0 rounded-xl border px-4 py-3 text-xs font-bold transition ${
                  aba === item.valor
                    ? "border-purple-500 bg-purple-600 text-white"
                    : "border-purple-500/20 bg-[#1b1026] text-gray-400 hover:text-white"
                }`}
              >
                {item.titulo}
              </button>

            ))}

          </div>

          {/* =====================================
              LISTA VAZIA
          ===================================== */}

          {pedidosFiltrados.length === 0 && (

            <div className="mt-6 rounded-[28px] border border-purple-500/20 bg-[#1b1026] px-6 py-16 text-center">

              <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl bg-purple-500/10 text-4xl">
                📦
              </div>

              <h3 className="mt-7 text-xl font-black">
                Nenhum pedido encontrado
              </h3>

              <p className="mx-auto mt-4 max-w-md text-sm leading-7 text-gray-400">

                {aba === "concluidos"
                  ? "Os pedidos entregues aparecerão aqui automaticamente."
                  : "Nenhum pedido encontrado nesta categoria."}

              </p>

            </div>

          )}

          {/* =====================================
              CARDS DE PEDIDOS
          ===================================== */}

          <div className="mt-6 space-y-5">

            {pedidosFiltrados.map((pedido) => {

              const aberto =
                pedidoAberto === pedido.id;

              const quantidade =
                pedido.quantidade ??
                pedido.itens?.reduce(
                  (totalItens, item) =>
                    totalItens +
                    (item.quantidade ?? 0),
                  0
                ) ??
                0;

              const empresa =
                pedido.parceiroEmpresa ||
                pedido.empresa ||
                "Estabelecimento não informado";

              const nome =
                pedido.parceiroNome ||
                pedido.nomeParceiro ||
                "Não informado";

              const email =
                pedido.parceiroEmail ||
                pedido.email ||
                "Não informado";

              const telefone =
                pedido.parceiroTelefone ||
                pedido.telefone ||
                "";

              const endereco =
                pedido.endereco;

              const localizacao =
                obterLocalizacao(pedido);

              const maps =
                linkGoogleMaps(pedido);

              const atualizando =
                pedidoAtualizando ===
                pedido.id;

              return (

                <article
                  key={pedido.id}
                  className="overflow-hidden rounded-[25px] border border-purple-500/20 bg-[#1b1026]"
                >

                  {/* =================================
                      TOPO
                  ================================= */}

                  <div className="p-5 sm:p-7">

                    <div className="flex flex-wrap items-start justify-between gap-4">

                      <div className="min-w-0">

                        <p className="text-[10px] font-bold uppercase tracking-[2px] text-purple-400">
                          Pedido
                        </p>

                        <h3 className="mt-2 break-all text-xl font-black">
                          #{pedido.id.slice(0, 8)}
                        </h3>

                        <p className="mt-2 text-xs text-gray-500">
                          {formatarData(
                            pedido.criadoEm
                          )}
                        </p>

                      </div>

                      <span
                        className={`rounded-full border px-4 py-2 text-xs font-bold ${corStatus(
                          pedido.status
                        )}`}
                      >
                        {nomeStatus(
                          pedido.status
                        )}
                      </span>

                    </div>

                    {/* EMPRESA */}

                    <div className="mt-6 border-t border-purple-500/15 pt-5">

                      <span className="text-[10px] font-bold uppercase tracking-[2px] text-purple-400">
                        Estabelecimento
                      </span>

                      <h4 className="mt-3 break-words text-xl font-black">
                        {empresa}
                      </h4>

                      <p className="mt-2 text-sm text-gray-400">
                        {nome}
                      </p>

                    </div>

                    {/* RESUMO */}

                    <div className="mt-6 grid grid-cols-2 gap-4">

                      <div>

                        <p className="text-xs text-gray-500">
                          Quantidade
                        </p>

                        <p className="mt-2 font-bold">
                          {quantidade}{" "}
                          {quantidade === 1
                            ? "barra"
                            : "barras"}
                        </p>

                      </div>

                      <div>

                        <p className="text-xs text-gray-500">
                          Valor
                        </p>

                        <p className="mt-2 font-black text-green-400">

                          {pedido.valorPendente
                            ? "A definir"
                            : typeof pedido.total ===
                              "number"
                            ? formatarMoeda(
                                pedido.total
                              )
                            : "Não informado"}

                        </p>

                      </div>

                    </div>

                    {/* =================================
                        ENDEREÇO RESUMIDO
                    ================================= */}

                    <div className="mt-6 rounded-xl border border-purple-500/20 bg-black/20 p-4">

                      <p className="text-xs font-bold text-purple-300">
                        📍 Endereço de entrega
                      </p>

                      <p className="mt-3 whitespace-pre-line break-words text-sm leading-6 text-gray-300">

                        {formatarEndereco(
                          endereco
                        )}

                      </p>

                      {/* GOOGLE MAPS */}

                      {maps && (

                        <a
                          href={maps}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mt-4 flex w-full items-center justify-center rounded-xl bg-blue-600 px-4 py-4 text-center text-sm font-black text-white transition hover:bg-blue-500"
                        >
                          📍 Abrir localização no Google Maps
                        </a>

                      )}

                      {!maps && (

                        <p className="mt-4 text-xs leading-6 text-yellow-400">
                          Localização GPS não cadastrada para este pedido.
                        </p>

                      )}

                    </div>

                    {/* =================================
                        AÇÕES RÁPIDAS
                    ================================= */}

                    <div className="mt-6 space-y-3">

                      {/* PREPARAR PEDIDO */}

                      {pedido.status === "novo" && (

                        <button
                          type="button"
                          disabled={atualizando}
                          onClick={() =>
                            atualizarStatus(
                              pedido,
                              "em_andamento"
                            )
                          }
                          className="w-full rounded-xl bg-blue-600 px-5 py-4 font-black transition hover:bg-blue-500 disabled:opacity-50"
                        >
                          {atualizando
                            ? "Atualizando..."
                            : "📦 Preparar pedido"}
                        </button>

                      )}

                      {/* COMEÇAR ENTREGA */}

                      {pedido.status ===
                        "em_andamento" && (

                        <button
                          type="button"
                          disabled={atualizando}
                          onClick={() =>
                            atualizarStatus(
                              pedido,
                              "em_rota"
                            )
                          }
                          className="w-full rounded-xl bg-purple-600 px-5 py-4 font-black transition hover:bg-purple-500 disabled:opacity-50"
                        >
                          {atualizando
                            ? "Atualizando..."
                            : "🚚 Começar entrega"}
                        </button>

                      )}

                      {/* CONFIRMAR ENTREGA */}

                      {pedido.status ===
                        "em_rota" && (

                        <button
                          type="button"
                          disabled={atualizando}
                          onClick={() =>
                            atualizarStatus(
                              pedido,
                              "entregue"
                            )
                          }
                          className="w-full rounded-xl bg-green-600 px-5 py-4 font-black text-white transition hover:bg-green-500 disabled:opacity-50"
                        >
                          {atualizando
                            ? "Atualizando..."
                            : "✓ Confirmar entrega"}
                        </button>

                      )}

                      {/* CONCLUÍDO */}

                      {pedido.status ===
                        "entregue" && (

                        <div className="rounded-xl border border-green-500/30 bg-green-500/10 p-4 text-center">

                          <p className="font-black text-green-400">
                            ✓ Pedido entregue
                          </p>

                          <p className="mt-2 text-xs text-gray-400">

                            {formatarData(
                              pedido.entregueEm
                            )}

                          </p>

                        </div>

                      )}

                      {/* CANCELADO */}

                      {pedido.status ===
                        "cancelado" && (

                        <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-center text-sm font-bold text-red-400">
                          Pedido cancelado
                        </div>

                      )}

                    </div>

                    {/* =================================
                        VER DETALHES
                    ================================= */}

                    <button
                      type="button"
                      onClick={() =>
                        setPedidoAberto(
                          aberto
                            ? null
                            : pedido.id
                        )
                      }
                      className="mt-5 flex w-full items-center justify-between rounded-xl border border-purple-500/20 bg-purple-500/10 px-5 py-4 text-sm font-bold text-purple-300 transition hover:bg-purple-500/20"
                    >

                      <span>
                        {aberto
                          ? "Ocultar detalhes"
                          : "Ver todos os detalhes"}
                      </span>

                      <span>
                        {aberto ? "↑" : "↓"}
                      </span>

                    </button>

                  </div>

                  {/* =================================
                      DETALHES EXPANDIDOS
                  ================================= */}

                  {aberto && (

                    <div className="border-t border-purple-500/20 bg-black/20 p-5 sm:p-7">

                      {/* PARCEIRO */}

                      <h4 className="font-black text-purple-300">
                        Dados do parceiro
                      </h4>

                      <div className="mt-4 space-y-3 break-words text-sm leading-7 text-gray-400">

                        <p>
                          <strong>Nome:</strong>{" "}
                          {nome}
                        </p>

                        <p>
                          <strong>Empresa:</strong>{" "}
                          {empresa}
                        </p>

                        <p>
                          <strong>E-mail:</strong>{" "}
                          {email}
                        </p>

                        <p>
                          <strong>Telefone:</strong>{" "}
                          {telefone ||
                            "Não informado"}
                        </p>

                        {telefone && (

                          <a
                            href={`tel:${telefone.replace(
                              /\D/g,
                              ""
                            )}`}
                            className="inline-block rounded-xl border border-green-500/30 bg-green-500/10 px-5 py-3 font-bold text-green-400"
                          >
                            📞 Ligar para parceiro
                          </a>

                        )}

                      </div>

                      {/* ENDEREÇO */}

                      <div className="mt-8 border-t border-purple-500/15 pt-6">

                        <h4 className="font-black text-purple-300">
                          Endereço completo
                        </h4>

                        <p className="mt-4 whitespace-pre-line break-words text-sm leading-7 text-gray-300">

                          {formatarEndereco(
                            endereco
                          )}

                        </p>

                        {endereco?.complemento && (

                          <p className="mt-3 text-sm text-gray-400">

                            Complemento:{" "}

                            {endereco.complemento}

                          </p>

                        )}

                        {(endereco?.referencia ||
                          endereco?.pontoDeReferencia) && (

                          <p className="mt-3 text-sm text-gray-400">

                            Referência:{" "}

                            {endereco.referencia ||
                              endereco.pontoDeReferencia}

                          </p>

                        )}

                        {/* GPS */}

                        {localizacao && (

                          <div className="mt-5 rounded-xl border border-blue-500/20 bg-blue-500/5 p-4">

                            <p className="text-xs font-bold uppercase tracking-[2px] text-blue-300">
                              Localização GPS
                            </p>

                            <p className="mt-3 break-all text-xs text-gray-400">

                              Latitude:{" "}

                              {localizacao.latitude}

                            </p>

                            <p className="mt-2 break-all text-xs text-gray-400">

                              Longitude:{" "}

                              {localizacao.longitude}

                            </p>

                            {typeof localizacao.precisaoMetros ===
                              "number" && (

                              <p className="mt-2 text-xs text-gray-400">

                                Precisão informada:{" "}

                                {Math.round(
                                  localizacao.precisaoMetros
                                )}{" "}

                                metros

                              </p>

                            )}

                          </div>

                        )}

                        {maps && (

                          <a
                            href={maps}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="mt-5 flex w-full items-center justify-center rounded-xl bg-blue-600 px-5 py-4 text-center font-black transition hover:bg-blue-500"
                          >
                            🗺️ Iniciar navegação no Maps
                          </a>

                        )}

                      </div>

                      {/* PRODUTOS */}

                      <div className="mt-8 border-t border-purple-500/15 pt-6">

                        <h4 className="font-black text-purple-300">
                          Produtos
                        </h4>

                        <div className="mt-4 space-y-3">

                          {pedido.itens &&
                          pedido.itens.length > 0 ? (

                            pedido.itens.map(
                              (item, index) => (

                                <div
                                  key={index}
                                  className="flex justify-between gap-4 text-sm text-gray-400"
                                >

                                  <span>
                                    {item.nome ||
                                      "Barra de Açaí"}
                                  </span>

                                  <span className="shrink-0 font-bold text-white">

                                    {item.quantidade ?? 0} un.

                                  </span>

                                </div>

                              )
                            )

                          ) : (

                            <div className="flex justify-between gap-4 text-sm text-gray-400">

                              <span>
                                {pedido.produto ||
                                  "Barra de Açaí"}
                              </span>

                              <span className="font-bold text-white">

                                {quantidade} un.

                              </span>

                            </div>

                          )}

                        </div>

                      </div>

                      {/* PAGAMENTO */}

                      <div className="mt-8 border-t border-purple-500/15 pt-6">

                        <h4 className="font-black text-purple-300">
                          Pagamento
                        </h4>

                        <p className="mt-4 text-sm text-gray-400">

                          Forma:{" "}

                          {pedido.formaPagamento ||
                            "Não informada"}

                        </p>

                        <p className="mt-3 text-sm text-gray-400">

                          Situação:{" "}

                          {pedido.statusPagamento ||
                            "Não informada"}

                        </p>

                      </div>

                      {/* OBSERVAÇÕES */}

                      {pedido.observacao && (

                        <div className="mt-8 border-t border-purple-500/15 pt-6">

                          <h4 className="font-black text-purple-300">
                            Observações
                          </h4>

                          <p className="mt-4 whitespace-pre-wrap break-words text-sm leading-7 text-gray-400">

                            {pedido.observacao}

                          </p>

                        </div>

                      )}

                      {/* HISTÓRICO */}

                      <div className="mt-8 border-t border-purple-500/15 pt-6">

                        <h4 className="font-black text-purple-300">
                          Histórico da entrega
                        </h4>

                        <div className="mt-5 space-y-4 text-sm text-gray-400">

                          <p>
                            📦 Recebido:{" "}

                            {formatarData(
                              pedido.criadoEm
                            )}
                          </p>

                          {pedido.iniciadoEm && (

                            <p>
                              🔵 Preparação:{" "}

                              {formatarData(
                                pedido.iniciadoEm
                              )}
                            </p>

                          )}

                          {pedido.saiuParaEntregaEm && (

                            <p>
                              🚚 Saiu para entrega:{" "}

                              {formatarData(
                                pedido.saiuParaEntregaEm
                              )}
                            </p>

                          )}

                          {pedido.entregueEm && (

                            <p className="text-green-400">
                              ✅ Entregue:{" "}

                              {formatarData(
                                pedido.entregueEm
                              )}
                            </p>

                          )}

                          {pedido.canceladoEm && (

                            <p className="text-red-400">
                              ❌ Cancelado:{" "}

                              {formatarData(
                                pedido.canceladoEm
                              )}
                            </p>

                          )}

                        </div>

                      </div>

                      {/* CANCELAMENTO */}

                      {[
                        "novo",
                        "em_andamento",
                      ].includes(pedido.status) && (

                        <button
                          type="button"
                          disabled={atualizando}
                          onClick={() =>
                            atualizarStatus(
                              pedido,
                              "cancelado"
                            )
                          }
                          className="mt-8 w-full rounded-xl border border-red-500/30 bg-red-500/10 px-5 py-4 text-sm font-bold text-red-400 transition hover:bg-red-500/20 disabled:opacity-50"
                        >

                          Cancelar pedido

                        </button>

                      )}

                    </div>

                  )}

                </article>

              );
            })}

          </div>

        </section>

      </div>

      {/* =====================================
          RODAPÉ
      ===================================== */}

      <footer className="border-t border-purple-500/10 bg-black px-5 py-8 text-center">

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