
"use client";

import Image from "next/image";
import Link from "next/link";

import {
  useEffect,
  useState,
  type FormEvent,
} from "react";

import { useRouter } from "next/navigation";

import {
  onAuthStateChanged,
  signOut,
  type User,
} from "firebase/auth";

import {
  addDoc,
  collection,
  doc,
  getDoc,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  where,
  type Timestamp,
} from "firebase/firestore";

import { auth, db } from "../firebase/config";

// ==========================================
// TIPOS
// ==========================================

type Parceiro = {
  nome: string;
  empresa: string;
  email: string;
  telefone: string;
  status: string;
};

type Localizacao = {
  latitude: number;
  longitude: number;
  precisaoMetros: number;
};

type Endereco = {
  cep: string;
  rua: string;
  numero: string;
  bairro: string;
  cidade: string;
  estado: string;
  complemento: string;
  referencia: string;
  localizacao: Localizacao | null;
};

// ==========================================
// PEDIDOS DO PARCEIRO
// ==========================================

type PedidoRecente = {
  id: string;
  produto: string;
  quantidade: number;
  formaPagamento: string;
  status: string;
  statusPagamento: string;
  criadoEm?: Timestamp | null;
  atualizadoEm?: Timestamp | null;
};

function formatarDataPedido(data?: Timestamp | null) {
  if (!data || typeof data.toDate !== "function") {
    return "Agora";
  }

  return data.toDate().toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function textoStatusPedido(status: string) {
  switch (status) {
    case "novo":
      return "Pedido recebido";
    case "em_andamento":
      return "Em preparação";
    case "em_rota":
      return "Saiu para entrega";
    case "entregue":
      return "Entregue";
    case "cancelado":
      return "Cancelado";
    default:
      return status || "Em análise";
  }
}

function classeStatusPedido(status: string) {
  switch (status) {
    case "novo":
      return "border-yellow-500/30 bg-yellow-500/10 text-yellow-300";
    case "em_andamento":
      return "border-purple-500/30 bg-purple-500/10 text-purple-300";
    case "em_rota":
      return "border-blue-500/30 bg-blue-500/10 text-blue-300";
    case "entregue":
      return "border-green-500/30 bg-green-500/10 text-green-300";
    case "cancelado":
      return "border-red-500/30 bg-red-500/10 text-red-300";
    default:
      return "border-gray-500/30 bg-gray-500/10 text-gray-300";
  }
}

// ==========================================
// ENDEREÇO INICIAL
// ==========================================

const enderecoInicial: Endereco = {
  cep: "",
  rua: "",
  numero: "",
  bairro: "",
  cidade: "",
  estado: "",
  complemento: "",
  referencia: "",
  localizacao: null,
};

// ==========================================
// ESTILOS
// ==========================================

const campoClasse =
  "w-full rounded-xl border border-purple-500/25 " +
  "bg-[#100719] px-4 py-4 text-sm text-white " +
  "outline-none transition placeholder:text-gray-600 " +
  "focus:border-purple-500 focus:ring-2 " +
  "focus:ring-purple-500/20 disabled:opacity-50";

const labelClasse =
  "mb-2 block text-sm font-bold text-gray-200";

// ==========================================
// VALIDAÇÃO DO ENDEREÇO
// ==========================================

function validarEndereco(endereco: Endereco) {
  const cep = endereco.cep.replace(/\D/g, "");

  if (cep.length !== 8) {
    return "Informe um CEP válido com 8 números.";
  }

  if (
    !endereco.rua.trim() ||
    !endereco.numero.trim() ||
    !endereco.bairro.trim() ||
    !endereco.cidade.trim()
  ) {
    return "Preencha todos os campos obrigatórios do endereço.";
  }

  if (
    !/^[A-Za-z]{2}$/.test(
      endereco.estado.trim()
    )
  ) {
    return "Informe uma UF válida com duas letras.";
  }

  if (!endereco.localizacao) {
    return (
      "Capture a localização GPS do estabelecimento " +
      "antes de salvar o endereço."
    );
  }

  const { latitude, longitude } =
    endereco.localizacao;

  if (
    !Number.isFinite(latitude) ||
    !Number.isFinite(longitude) ||
    latitude < -90 ||
    latitude > 90 ||
    longitude < -180 ||
    longitude > 180
  ) {
    return "A localização capturada é inválida.";
  }

  return "";
}

// ==========================================
// PÁGINA PRINCIPAL
// ==========================================

export default function ParceirosPage() {
  const router = useRouter();

  // ========================================
  // AUTENTICAÇÃO
  // ========================================

  const [usuario, setUsuario] =
    useState<User | null>(null);

  const [parceiro, setParceiro] =
    useState<Parceiro | null>(null);

  const [carregando, setCarregando] =
    useState(true);

  const [erro, setErro] =
    useState("");

  // ========================================
  // ENDEREÇO
  // ========================================

  const [endereco, setEndereco] =
    useState<Endereco>(enderecoInicial);

  const [enderecoSalvo, setEnderecoSalvo] =
    useState(false);

  const [editandoEndereco, setEditandoEndereco] =
    useState(true);

  const [carregandoEndereco, setCarregandoEndereco] =
    useState(true);

  const [salvandoEndereco, setSalvandoEndereco] =
    useState(false);

  const [capturandoGPS, setCapturandoGPS] =
    useState(false);

  const [buscandoCep, setBuscandoCep] =
    useState(false);

  const [mensagemEndereco, setMensagemEndereco] =
    useState("");

  const [erroEndereco, setErroEndereco] =
    useState("");

  // ========================================
  // PEDIDO
  // ========================================

  const [quantidade, setQuantidade] =
    useState(1);

  const [formaPagamento, setFormaPagamento] =
    useState("");

  const [observacao, setObservacao] =
    useState("");

  const [enviando, setEnviando] =
    useState(false);

  const [pedidoSucesso, setPedidoSucesso] =
    useState("");

  const [pedidosRecentes, setPedidosRecentes] =
    useState<PedidoRecente[]>([]);

  const [carregandoPedidos, setCarregandoPedidos] =
    useState(true);

  const [erroPedidos, setErroPedidos] =
    useState("");

  // ========================================
  // MONITORAR AUTENTICAÇÃO
  // ========================================

  useEffect(() => {
    let ativo = true;

    let cancelarParceiro:
      (() => void) | undefined;

    const cancelarAuth = onAuthStateChanged(
      auth,

      (usuarioAtual) => {
        cancelarParceiro?.();

        cancelarParceiro = undefined;

        if (!ativo) return;

        setCarregando(true);
        setErro("");

        setUsuario(null);
        setParceiro(null);

        if (!usuarioAtual) {
          router.replace("/login");
          return;
        }

        cancelarParceiro = onSnapshot(
          doc(
            db,
            "parceiros",
            usuarioAtual.uid
          ),

          (snapshot) => {
            if (!ativo) return;

            if (!snapshot.exists()) {
              router.replace("/status");
              return;
            }

            const dados = snapshot.data();

            if (dados.status !== "aprovado") {
              router.replace("/status");
              return;
            }

            setParceiro({
              nome: dados.nome || "Parceiro",

              empresa: dados.empresa || "",

              email:
                dados.email ||
                usuarioAtual.email ||
                "",

              telefone: dados.telefone || "",

              status: dados.status,
            });

            setUsuario(usuarioAtual);

            setCarregando(false);
          },

          (error) => {
            console.error(error);

            if (ativo) {
              setErro(
                "Não foi possível verificar sua autorização."
              );

              setCarregando(false);
            }
          }
        );
      }
    );

    return () => {
      ativo = false;

      cancelarAuth();

      cancelarParceiro?.();
    };
  }, [router]);

  // ========================================
  // MONITORAR ÚLTIMOS PEDIDOS
  // ========================================

  useEffect(() => {
    if (!usuario || !parceiro) {
      setPedidosRecentes([]);
      setCarregandoPedidos(false);
      return;
    }

    setCarregandoPedidos(true);
    setErroPedidos("");

    // IMPORTANTE:
    // A consulta precisa filtrar pelo parceiroId,
    // pois as regras do Firestore permitem que o
    // parceiro leia somente os próprios pedidos.
    const pedidosQuery = query(
      collection(db, "pedidos"),
      where("parceiroId", "==", usuario.uid)
    );

    const cancelarPedidos = onSnapshot(
      pedidosQuery,
      (snapshot) => {
        const lista: PedidoRecente[] = snapshot.docs.map(
          (documento) => {
            const dados = documento.data();

            return {
              id: documento.id,
              produto: dados.produto || "Barra de Açaí",
              quantidade:
                typeof dados.quantidade === "number"
                  ? dados.quantidade
                  : 0,
              formaPagamento: dados.formaPagamento || "A combinar",
              status: dados.status || "novo",
              statusPagamento:
                dados.statusPagamento || "a_combinar",
              criadoEm: dados.criadoEm || null,
              atualizadoEm: dados.atualizadoEm || null,
            };
          }
        );

        // Ordenamos no navegador para evitar a necessidade
        // de índice composto no Firestore.
        lista.sort((a, b) => {
          const dataA = a.criadoEm?.toMillis?.() ?? 0;
          const dataB = b.criadoEm?.toMillis?.() ?? 0;
          return dataB - dataA;
        });

        setPedidosRecentes(lista.slice(0, 5));
        setCarregandoPedidos(false);
        setErroPedidos("");
      },
      (error) => {
        console.error("Erro ao carregar pedidos do parceiro:", error);
        setErroPedidos(
          "Não foi possível carregar seus últimos pedidos."
        );
        setCarregandoPedidos(false);
      }
    );

    return () => {
      cancelarPedidos();
    };
  }, [usuario, parceiro]);

  // ========================================
  // CARREGAR ENDEREÇO SALVO
  // ========================================

  useEffect(() => {
    if (!usuario || !parceiro) return;

    let ativo = true;

    const uid = usuario.uid;

    async function carregarEndereco() {
      setCarregandoEndereco(true);

      setErroEndereco("");

      setEnderecoSalvo(false);
      setEditandoEndereco(true);

      try {
        const enderecoRef = doc(
          db,
          "enderecos",
          uid
        );

        const snapshot =
          await getDoc(enderecoRef);

        if (!ativo) return;

        if (snapshot.exists()) {
          const dados = snapshot.data();

          const local = dados.localizacao;

          const localizacaoValida =
            local &&
            typeof local.latitude === "number" &&
            typeof local.longitude === "number" &&
            Number.isFinite(local.latitude) &&
            Number.isFinite(local.longitude) &&
            local.latitude >= -90 &&
            local.latitude <= 90 &&
            local.longitude >= -180 &&
            local.longitude <= 180;

          const enderecoCarregado: Endereco = {
            cep: dados.cep || "",

            rua: dados.rua || "",

            numero: dados.numero || "",

            bairro: dados.bairro || "",

            cidade: dados.cidade || "",

            estado: dados.estado || "",

            complemento:
              dados.complemento || "",

            referencia:
              dados.referencia || "",

            localizacao: localizacaoValida
              ? {
                  latitude: local.latitude,

                  longitude: local.longitude,

                  precisaoMetros:
                    typeof local.precisaoMetros ===
                    "number"
                      ? local.precisaoMetros
                      : 0,
                }
              : null,
          };

          setEndereco(enderecoCarregado);

          // ENDEREÇO ANTIGO SEM GPS
          // PRECISA SER COMPLETADO

          if (
            localizacaoValida &&
            !validarEndereco(enderecoCarregado)
          ) {
            setEnderecoSalvo(true);

            setEditandoEndereco(false);
          }
        } else {
          setEndereco({ ...enderecoInicial });
        }
      } catch (error) {
        console.error(
          "Erro ao carregar endereço:",
          error
        );

        if (ativo) {
          setErroEndereco(
            "Não foi possível consultar seu endereço. " +
            "Verifique sua conexão e as regras do Firebase."
          );
        }
      } finally {
        if (ativo) {
          setCarregandoEndereco(false);
        }
      }
    }

    carregarEndereco();

    return () => {
      ativo = false;
    };
  }, [usuario, parceiro]);

  // ========================================
  // ALTERAR ENDEREÇO
  // ========================================

  function alterarEndereco(
    campo: keyof Omit<
      Endereco,
      "localizacao"
    >,
    valor: string
  ) {
    setMensagemEndereco("");
    setErroEndereco("");

    setEnderecoSalvo(false);

    setEndereco((anterior) => ({
      ...anterior,

      [campo]: valor,
    }));
  }

  // ========================================
  // BUSCAR CEP
  // ========================================

  async function consultarCep() {
    const cep = endereco.cep.replace(
      /\D/g,
      ""
    );

    if (cep.length !== 8) {
      setErroEndereco(
        "Informe um CEP com 8 números."
      );

      return;
    }

    setBuscandoCep(true);
    setErroEndereco("");

    try {
      const resposta = await fetch(
        `https://viacep.com.br/ws/${cep}/json/`
      );

      if (!resposta.ok) {
        throw new Error(
          "Falha ao consultar CEP."
        );
      }

      const dados = await resposta.json();

      if (dados.erro) {
        setErroEndereco(
          "CEP não encontrado."
        );

        return;
      }

      setEndereco((anterior) => {
        // EVITAR APLICAR UM RESULTADO
        // PARA OUTRO CEP DIGITADO

        if (
          anterior.cep.replace(/\D/g, "") !==
          cep
        ) {
          return anterior;
        }

        return {
          ...anterior,

          rua:
            dados.logradouro ||
            anterior.rua,

          bairro:
            dados.bairro ||
            anterior.bairro,

          cidade:
            dados.localidade ||
            anterior.cidade,

          estado:
            dados.uf ||
            anterior.estado,
        };
      });

      setEnderecoSalvo(false);
    } catch (error) {
      console.error(error);

      setErroEndereco(
        "Não foi possível consultar o CEP. " +
        "Você pode preencher os campos manualmente."
      );
    } finally {
      setBuscandoCep(false);
    }
  }

  // ========================================
  // CAPTURAR LOCALIZAÇÃO GPS
  // ========================================

  function capturarLocalizacao() {
    setErroEndereco("");
    setMensagemEndereco("");

    if (!navigator.geolocation) {
      setErroEndereco(
        "Seu navegador não oferece suporte à localização GPS."
      );

      return;
    }

    if (!window.isSecureContext) {
      setErroEndereco(
        "A localização exige uma conexão segura HTTPS ou localhost."
      );

      return;
    }

    setCapturandoGPS(true);

    navigator.geolocation.getCurrentPosition(
      (posicao) => {
        const { coords } = posicao;

        if (
          !Number.isFinite(coords.latitude) ||
          !Number.isFinite(coords.longitude)
        ) {
          setErroEndereco(
            "O navegador retornou uma localização inválida."
          );

          setCapturandoGPS(false);

          return;
        }

        const precisao =
          coords.accuracy;

        setEndereco((anterior) => ({
          ...anterior,

          localizacao: {
            latitude: coords.latitude,

            longitude: coords.longitude,

            precisaoMetros: precisao,
          },
        }));

        setEnderecoSalvo(false);

        setMensagemEndereco(
          precisao > 100
            ? "Localização capturada, mas com baixa precisão. " +
              "Confirme o ponto no mapa e tente novamente " +
              "em um local com melhor sinal, se necessário."
            : "Localização capturada! Confira o ponto no mapa."
        );

        setCapturandoGPS(false);
      },

      (error) => {
        let mensagem =
          "Não foi possível obter sua localização.";

        if (error.code === 1) {
          mensagem =
            "Permissão de localização negada. " +
            "Autorize o GPS no navegador e tente novamente.";
        }

        if (error.code === 2) {
          mensagem =
            "Localização indisponível. " +
            "Verifique se o GPS está ativado.";
        }

        if (error.code === 3) {
          mensagem =
            "O GPS demorou muito para responder. " +
            "Tente novamente.";
        }

        setErroEndereco(mensagem);

        setCapturandoGPS(false);
      },

      {
        enableHighAccuracy: true,

        timeout: 20000,

        maximumAge: 0,
      }
    );
  }

  // ========================================
  // GOOGLE MAPS
  // ========================================

  function obterLinkMapa() {
    if (!endereco.localizacao) {
      return null;
    }

    const {
      latitude,
      longitude,
    } = endereco.localizacao;

    return (
      "https://www.google.com/maps/search/?api=1&query=" +
      encodeURIComponent(
        `${latitude},${longitude}`
      )
    );
  }

  // ========================================
  // SALVAR ENDEREÇO
  // ========================================

  async function salvarEndereco() {
    if (!usuario || !parceiro) {
      return;
    }

    if (salvandoEndereco) {
      return;
    }

    setErroEndereco("");
    setMensagemEndereco("");

    const erroValidacao =
      validarEndereco(endereco);

    if (erroValidacao) {
      setErroEndereco(erroValidacao);

      return;
    }

    const local = endereco.localizacao;

    if (!local) return;

    setSalvandoEndereco(true);

    try {
      const usuarioAtual =
        auth.currentUser;

      if (
        !usuarioAtual ||
        usuarioAtual.uid !== usuario.uid
      ) {
        throw new Error(
          "Sua sessão expirou. Faça login novamente."
        );
      }

      const enderecoRef = doc(
        db,
        "enderecos",
        usuario.uid
      );

      const dadosEndereco = {
        parceiroId: usuario.uid,

        cep: endereco.cep.replace(
          /\D/g,
          ""
        ),

        rua: endereco.rua.trim(),

        numero: endereco.numero.trim(),

        bairro: endereco.bairro.trim(),

        cidade: endereco.cidade.trim(),

        estado: endereco.estado
          .trim()
          .toUpperCase(),

        complemento:
          endereco.complemento.trim(),

        referencia:
          endereco.referencia.trim(),

        localizacao: {
          latitude: local.latitude,

          longitude: local.longitude,

          precisaoMetros:
            local.precisaoMetros,
        },

        atualizadoEm:
          serverTimestamp(),
      };

      // CRIA OU ATUALIZA O ENDEREÇO
      // NO DOCUMENTO DO PRÓPRIO PARCEIRO

      await setDoc(
        enderecoRef,
        dadosEndereco,
        { merge: true }
      );

      setEnderecoSalvo(true);

      setEditandoEndereco(false);

      setMensagemEndereco(
        "Endereço salvo com sucesso! " +
        "Ele estará disponível nas suas próximas compras."
      );
    } catch (error) {
      console.error(
        "Erro ao salvar endereço:",
        error
      );

      setErroEndereco(
        "Não foi possível salvar seu endereço. " +
        "Verifique a conexão e as regras do Firestore."
      );
    } finally {
      setSalvandoEndereco(false);
    }
  }

  // ========================================
  // QUANTIDADE
  // ========================================

  function aumentar() {
    setQuantidade((anterior) =>
      Math.min(anterior + 1, 999)
    );
  }

  function diminuir() {
    setQuantidade((anterior) =>
      Math.max(anterior - 1, 1)
    );
  }

  // ========================================
  // FINALIZAR PEDIDO
  // ========================================

  async function finalizarPedido(
    evento: FormEvent<HTMLFormElement>
  ) {
    evento.preventDefault();

    if (
      !usuario ||
      !parceiro ||
      enviando
    ) {
      return;
    }

    setErro("");
    setPedidoSucesso("");

    // QUANTIDADE

    if (
      !Number.isInteger(quantidade) ||
      quantidade < 1 ||
      quantidade > 999
    ) {
      setErro(
        "Informe uma quantidade válida."
      );

      return;
    }

    // ENDEREÇO

    if (
      !enderecoSalvo ||
      editandoEndereco
    ) {
      setErro(
        "Salve e confirme seu endereço antes de enviar o pedido."
      );

      return;
    }

    if (!formaPagamento) {
      setErro(
        "Selecione uma forma de pagamento."
      );

      return;
    }

    setEnviando(true);

    try {
      const usuarioAtual =
        auth.currentUser;

      if (
        !usuarioAtual ||
        usuarioAtual.uid !== usuario.uid
      ) {
        throw new Error(
          "Sua sessão expirou."
        );
      }

      // CONSULTAR ENDEREÇO DIRETAMENTE
      // DO FIREBASE PARA EVITAR DADOS
      // DESATUALIZADOS NA TELA

      const enderecoRef = doc(
        db,
        "enderecos",
        usuario.uid
      );

      const enderecoSnapshot =
        await getDoc(enderecoRef);

      if (!enderecoSnapshot.exists()) {
        throw new Error(
          "Endereço não encontrado. Salve novamente."
        );
      }

      const enderecoAtual =
        enderecoSnapshot.data();

      const enderecoPedido: Endereco = {
        cep: enderecoAtual.cep || "",

        rua: enderecoAtual.rua || "",

        numero: enderecoAtual.numero || "",

        bairro: enderecoAtual.bairro || "",

        cidade: enderecoAtual.cidade || "",

        estado: enderecoAtual.estado || "",

        complemento:
          enderecoAtual.complemento || "",

        referencia:
          enderecoAtual.referencia || "",

        localizacao:
          enderecoAtual.localizacao || null,
      };

      const enderecoInvalido =
        validarEndereco(enderecoPedido);

      if (enderecoInvalido) {
        throw new Error(
          "O endereço salvo está incompleto. " +
          enderecoInvalido
        );
      }

      const local =
        enderecoPedido.localizacao;

      if (!local) {
        throw new Error(
          "Localização GPS não encontrada."
        );
      }

      // REVALIDAR AUTORIZAÇÃO DO PARCEIRO

      const parceiroSnapshot = await getDoc(
        doc(
          db,
          "parceiros",
          usuario.uid
        )
      );

      if (
        !parceiroSnapshot.exists() ||
        parceiroSnapshot.data().status !==
          "aprovado"
      ) {
        throw new Error(
          "Seu cadastro não está autorizado a realizar pedidos."
        );
      }

      // ==================================
      // DOCUMENTO DO PEDIDO
      // ==================================

      const novoPedido = {
        parceiroId: usuario.uid,

        uid: usuario.uid,

        parceiroNome: parceiro.nome,

        parceiroEmpresa:
          parceiro.empresa,

        parceiroEmail:
          parceiro.email,

        parceiroTelefone:
          parceiro.telefone,

        produto: "Barra de Açaí",

        produtoId: "barra-acai",

        quantidade,

        itens: [
          {
            produtoId: "barra-acai",

            nome: "Barra de Açaí",

            quantidade,
          },
        ],

        // CÓPIA DO ENDEREÇO
        // PARA PRESERVAR O HISTÓRICO

        endereco: {
          cep: enderecoPedido.cep,

          rua: enderecoPedido.rua,

          numero: enderecoPedido.numero,

          bairro: enderecoPedido.bairro,

          cidade: enderecoPedido.cidade,

          estado: enderecoPedido.estado,

          complemento:
            enderecoPedido.complemento,

          referencia:
            enderecoPedido.referencia,

          pontoDeReferencia:
            enderecoPedido.referencia,

          latitude:
            local.latitude,

          longitude:
            local.longitude,

          localizacao: {
            latitude:
              local.latitude,

            longitude:
              local.longitude,

            precisaoMetros:
              local.precisaoMetros,
          },
        },

        // LOCALIZAÇÃO NO NÍVEL PRINCIPAL
        // PARA COMPATIBILIDADE COM O ADMIN

        localizacao: {
          latitude:
            local.latitude,

          longitude:
            local.longitude,

          precisaoMetros:
            local.precisaoMetros,
        },

        tipoEntrega: "entrega",

        formaPagamento,

        observacao:
          observacao.trim(),

        status: "novo",

        statusPagamento:
          "a_combinar",

        valorPendente: true,

        criadoEm:
          serverTimestamp(),

        atualizadoEm:
          serverTimestamp(),
      };

      // ==================================
      // REGISTRAR PEDIDO
      // ==================================

      const pedidoRef = await addDoc(
        collection(
          db,
          "pedidos"
        ),

        novoPedido
      );

      setPedidoSucesso(
        "Pedido enviado com sucesso! " +
        `Número: ${pedidoRef.id}`
      );

      setQuantidade(1);

      setFormaPagamento("");

      setObservacao("");

      document
        .getElementById(
          "mensagem-pedido"
        )
        ?.scrollIntoView({
          behavior: "smooth",

          block: "center",
        });
    } catch (error) {
      console.error(
        "Erro ao finalizar pedido:",
        error
      );

      setErro(
        error instanceof Error &&
        (
          error.message.includes(
            "sessão expirou"
          ) ||
          error.message.includes(
            "Endereço"
          ) ||
          error.message.includes(
            "endereço salvo"
          ) ||
          error.message.includes(
            "Localização"
          ) ||
          error.message.includes(
            "autorizado"
          )
        )
          ? error.message
          : "Não foi possível enviar o pedido. " +
            "Verifique a conexão e as permissões do Firestore."
      );
    } finally {
      setEnviando(false);
    }
  }

  // ========================================
  // SAIR
  // ========================================

  async function sair() {
    try {
      setCarregando(true);

      await signOut(auth);

      router.replace("/login");
    } catch (error) {
      console.error(error);

      setErro(
        "Não foi possível sair da conta."
      );

      setCarregando(false);
    }
  }

  // ========================================
  // TELA DE CARREGAMENTO
  // ========================================

  if (carregando) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-5 bg-[#0d0613] text-white">

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
          Preparando seu portal...
        </p>

      </main>
    );
  }

  // ========================================
  // ACESSO INDISPONÍVEL
  // ========================================

  if (!usuario || !parceiro) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-5 bg-[#0d0613] px-6 text-center text-white">

        <h1 className="text-2xl font-black">
          Verificando seu acesso
        </h1>

        <p className="text-sm text-gray-400">
          {erro ||
            "Redirecionando..."}
        </p>

        <Link
          href="/login"
          className="rounded-xl bg-purple-600 px-6 py-4 font-bold"
        >
          Voltar ao login
        </Link>

      </main>
    );
  }

  // ========================================
  // VARIÁVEIS DA INTERFACE
  // ========================================

  const mapa = obterLinkMapa();

  const enderecoConfirmado =
    enderecoSalvo &&
    !editandoEndereco;

  // ========================================
  // INTERFACE PRINCIPAL
  // ========================================

  return (
    <main className="min-h-screen overflow-x-hidden bg-[#0d0613] text-white">

      {/* =====================================
          CABEÇALHO
      ===================================== */}

      <header className="sticky top-0 z-50 border-b border-purple-500/20 bg-black">

        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-5 sm:px-6">

          <div>

            <h1 className="text-base font-black sm:text-xl">
              AÇAÍ DO{" "}

              <span className="text-purple-400">
                BRUXO
              </span>
            </h1>

            <p className="mt-1 text-[8px] font-bold uppercase tracking-[2px] text-purple-300">
              Portal de parceiros
            </p>

          </div>

          <button
            type="button"
            onClick={sair}
            className="shrink-0 rounded-xl border border-purple-500/40 px-4 py-3 text-xs font-bold text-purple-300 transition hover:bg-purple-900/30"
          >
            Sair da conta
          </button>

        </div>

      </header>

      {/* =====================================
          BOAS-VINDAS
      ===================================== */}

      <section className="relative overflow-hidden bg-gradient-to-br from-[#21102f] to-[#0d0613] px-5 pb-10 pt-12 sm:px-6">

        <div className="mx-auto grid max-w-7xl items-center gap-6 lg:grid-cols-2">

          <div>

            <span className="inline-block rounded-full border border-green-500/30 bg-green-500/10 px-5 py-2 text-[10px] font-bold uppercase tracking-[2px] text-green-400">
              ✓ Parceiro autorizado
            </span>

            <h2 className="mt-7 text-3xl font-black leading-tight sm:text-5xl">

              BEM-VINDO,
              <br />

              <span className="bg-gradient-to-r from-purple-300 to-fuchsia-400 bg-clip-text text-transparent">
                {parceiro.nome}!
              </span>

            </h2>

            <p className="mt-5 max-w-xl text-sm leading-7 text-gray-400 sm:text-base">

              Seu acesso está liberado.

              Escolha a quantidade de barras,
              confirme seu endereço e envie
              sua solicitação diretamente
              pelo nosso portal.

            </p>

            <div className="mt-7 rounded-2xl border border-purple-500/20 bg-[#21112f] p-5">

              <span className="text-[10px] font-bold uppercase tracking-[2px] text-purple-400">
                Seu estabelecimento
              </span>

              <p className="mt-2 text-lg font-black">
                {parceiro.empresa}
              </p>

              <p className="mt-2 break-all text-xs text-gray-400">
                {parceiro.email}
              </p>

            </div>

          </div>

          {/* MAGO */}

          <div className="relative flex h-[250px] items-center justify-center sm:h-[350px]">

            <div className="absolute h-56 w-56 rounded-full bg-purple-600/20 blur-[80px]" />

            <Image
              src="/mago.png"
              alt="Mago do Açaí do Bruxo"
              width={400}
              height={500}
              priority
              sizes="(max-width: 640px) 240px, 340px"
              className="relative h-[240px] w-auto object-contain drop-shadow-[0_0_30px_rgba(168,85,247,0.35)] sm:h-[340px]"
            />

          </div>

        </div>

      </section>

      {/* =====================================
          PEDIDO
      ===================================== */}

      <section className="px-4 py-14 sm:px-6">

        <div className="mx-auto max-w-5xl">

          <div className="mb-9">

            <span className="text-xs font-bold uppercase tracking-[3px] text-purple-400">
              Nosso produto
            </span>

            <h2 className="mt-4 text-3xl font-black sm:text-5xl">

              FAÇA SEU{" "}

              <span className="text-purple-400">
                PEDIDO.
              </span>

            </h2>

            <p className="mt-4 text-sm leading-7 text-gray-400">
              Escolha sua quantidade e confirme
              onde deseja receber as barras.
            </p>

          </div>

          {/* =====================================
              MENSAGENS
          ===================================== */}

          <div
            id="mensagem-pedido"
            className="scroll-mt-28"
          >

            {erro && (

              <div
                role="alert"
                className="mb-6 rounded-xl border border-red-500/30 bg-red-500/10 p-5 text-sm leading-7 text-red-300"
              >
                {erro}
              </div>

            )}

            {pedidoSucesso && (

              <div
                role="status"
                className="mb-7 rounded-2xl border border-green-500/30 bg-green-500/10 p-6"
              >

                <h3 className="text-xl font-black text-green-400">
                  ✓ Pedido recebido!
                </h3>

                <p className="mt-3 break-words text-sm leading-7 text-gray-300">
                  {pedidoSucesso}
                </p>

                <p className="mt-3 text-sm leading-7 text-gray-400">

                  Sua solicitação foi encaminhada
                  para nossa equipe administrativa.

                </p>

              </div>

            )}

            {/* =====================================
                ÚLTIMOS PEDIDOS DO PARCEIRO
            ===================================== */}

            <div className="mb-8 rounded-[28px] border border-purple-500/20 bg-[#160b22] p-5 sm:p-7">

              <div className="flex flex-wrap items-end justify-between gap-3">

                <div>
                  <span className="text-[10px] font-black uppercase tracking-[3px] text-purple-400">
                    Acompanhamento
                  </span>

                  <h3 className="mt-2 text-2xl font-black">
                    Seus últimos pedidos
                  </h3>

                  <p className="mt-2 text-sm leading-6 text-gray-400">
                    Acompanhe em tempo real o andamento das suas solicitações.
                  </p>
                </div>

                {pedidosRecentes.length > 0 && (
                  <span className="rounded-full border border-purple-500/30 bg-purple-500/10 px-4 py-2 text-xs font-bold text-purple-300">
                    {pedidosRecentes.length} recentes
                  </span>
                )}

              </div>

              {carregandoPedidos && (
                <div className="mt-6 flex items-center gap-3 rounded-2xl border border-purple-500/15 bg-black/20 p-5 text-sm text-purple-300">
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-purple-500/20 border-t-purple-400" />
                  Carregando seus pedidos...
                </div>
              )}

              {erroPedidos && !carregandoPedidos && (
                <div className="mt-6 rounded-2xl border border-red-500/25 bg-red-500/10 p-5 text-sm leading-6 text-red-300">
                  {erroPedidos}
                </div>
              )}

              {!carregandoPedidos &&
                !erroPedidos &&
                pedidosRecentes.length === 0 && (
                  <div className="mt-6 rounded-2xl border border-purple-500/15 bg-black/20 p-6 text-center">
                    <div className="text-3xl">📦</div>
                    <p className="mt-3 font-black">
                      Você ainda não fez nenhum pedido.
                    </p>
                    <p className="mt-2 text-sm text-gray-400">
                      Assim que enviar sua primeira solicitação, ela aparecerá aqui.
                    </p>
                  </div>
                )}

              {!carregandoPedidos &&
                pedidosRecentes.length > 0 && (
                  <div className="mt-6 space-y-4">
                    {pedidosRecentes.map((pedido, indice) => (
                      <article
                        key={pedido.id}
                        className="rounded-2xl border border-purple-500/20 bg-[#100719] p-5"
                      >
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div>
                            <p className="text-[9px] font-black uppercase tracking-[2px] text-purple-400">
                              Pedido {indice === 0 ? "mais recente" : `#${pedido.id.slice(0, 8)}`}
                            </p>

                            <h4 className="mt-2 text-lg font-black">
                              {pedido.produto}
                            </h4>

                            <p className="mt-1 text-xs text-gray-500">
                              {formatarDataPedido(pedido.criadoEm)}
                            </p>
                          </div>

                          <span
                            className={`rounded-full border px-3 py-2 text-[10px] font-black ${classeStatusPedido(
                              pedido.status
                            )}`}
                          >
                            {textoStatusPedido(pedido.status)}
                          </span>
                        </div>

                        <div className="mt-5 grid grid-cols-2 gap-3 border-t border-purple-500/10 pt-4 sm:grid-cols-3">
                          <div>
                            <p className="text-[9px] uppercase tracking-[1.5px] text-gray-500">
                              Quantidade
                            </p>
                            <p className="mt-1 text-sm font-black">
                              {pedido.quantidade} {pedido.quantidade === 1 ? "barra" : "barras"}
                            </p>
                          </div>

                          <div>
                            <p className="text-[9px] uppercase tracking-[1.5px] text-gray-500">
                              Pagamento
                            </p>
                            <p className="mt-1 text-sm font-black">
                              {pedido.formaPagamento}
                            </p>
                          </div>

                          <div className="col-span-2 sm:col-span-1">
                            <p className="text-[9px] uppercase tracking-[1.5px] text-gray-500">
                              Código
                            </p>
                            <p className="mt-1 break-all font-mono text-xs text-gray-300">
                              {pedido.id}
                            </p>
                          </div>
                        </div>

                        {pedido.status === "novo" && (
                          <div className="mt-4 rounded-xl border border-yellow-500/20 bg-yellow-500/5 p-4 text-xs leading-6 text-yellow-200">
                            ⏳ Recebemos seu pedido. Nossa equipe fará a conferência antes de iniciar a preparação.
                          </div>
                        )}

                        {pedido.status === "em_andamento" && (
                          <div className="mt-4 rounded-xl border border-purple-500/20 bg-purple-500/5 p-4 text-xs leading-6 text-purple-200">
                            🪄 Seu pedido está sendo preparado pela nossa equipe.
                          </div>
                        )}

                        {pedido.status === "em_rota" && (
                          <div className="mt-4 rounded-xl border border-blue-500/20 bg-blue-500/5 p-4 text-xs leading-6 text-blue-200">
                            🚚 Seu pedido saiu para entrega.
                          </div>
                        )}

                        {pedido.status === "entregue" && (
                          <div className="mt-4 rounded-xl border border-green-500/20 bg-green-500/5 p-4 text-xs leading-6 text-green-200">
                            ✅ Pedido entregue com sucesso.
                          </div>
                        )}

                        {pedido.status === "cancelado" && (
                          <div className="mt-4 rounded-xl border border-red-500/20 bg-red-500/5 p-4 text-xs leading-6 text-red-200">
                            ✕ Este pedido foi cancelado.
                          </div>
                        )}
                      </article>
                    ))}
                  </div>
                )}

            </div>

          </div>

          {/* =====================================
              FORMULÁRIO DO PEDIDO
          ===================================== */}

          <form
            onSubmit={finalizarPedido}
            className="space-y-8"
          >

            {/* =====================================
                PRODUTO
            ===================================== */}

            <div className="overflow-hidden rounded-[28px] border border-purple-500/20 bg-[#21112f]">

              <div className="relative flex h-[350px] items-center justify-center overflow-hidden bg-gradient-to-br from-[#301347] to-[#100719] sm:h-[450px]">

                <div className="absolute h-64 w-64 rounded-full bg-[#65ff00]/20 blur-[90px]" />

                <Image
                  src="/acai-macunaima.png"
                  alt="Barra de Açaí Macunaíma"
                  width={420}
                  height={550}
                  sizes="(max-width: 640px) 250px, 350px"
                  className="relative h-[300px] w-auto object-contain drop-shadow-[0_0_35px_rgba(100,255,0,0.4)] sm:h-[400px]"
                />

              </div>

              <div className="p-6 sm:p-9">

                <span className="text-xs font-bold uppercase tracking-[3px] text-purple-400">
                  Exclusivo para parceiros
                </span>

                <h3 className="mt-4 text-2xl font-black sm:text-3xl">
                  Barra de Açaí
                </h3>

                <p className="mt-3 text-sm text-gray-400">
                  Embalagem de aproximadamente 1 kg.
                </p>

                {/* QUANTIDADE */}

                <div className="mt-8 rounded-2xl border border-purple-500/20 bg-[#100719] p-5">

                  <h4 className="font-bold">
                    Quantidade de barras
                  </h4>

                  <div className="mt-5 flex items-center justify-between gap-3">

                    <button
                      type="button"
                      onClick={diminuir}
                      disabled={
                        quantidade <= 1 ||
                        enviando
                      }
                      aria-label="Diminuir quantidade"
                      className="flex h-12 w-12 items-center justify-center rounded-xl bg-purple-600 text-2xl font-black disabled:opacity-30"
                    >
                      −
                    </button>

                    <span className="text-3xl font-black">
                      {quantidade}
                    </span>

                    <button
                      type="button"
                      onClick={aumentar}
                      disabled={
                        quantidade >= 999 ||
                        enviando
                      }
                      aria-label="Aumentar quantidade"
                      className="flex h-12 w-12 items-center justify-center rounded-xl bg-purple-600 text-2xl font-black disabled:opacity-30"
                    >
                      +
                    </button>

                  </div>

                  <p className="mt-5 text-center text-xs text-purple-300">

                    {quantidade}{" "}

                    {quantidade === 1
                      ? "barra selecionada"
                      : "barras selecionadas"}

                  </p>

                </div>

              </div>

            </div>

            {/* =====================================
                ENDEREÇO PERMANENTE
            ===================================== */}

            <div className="overflow-hidden rounded-[28px] border border-purple-500/20 bg-[#21112f]">

              <div className="border-b border-purple-500/20 p-6 sm:p-9">

                <span className="text-xs font-bold uppercase tracking-[3px] text-purple-400">
                  Etapa 02
                </span>

                <h3 className="mt-4 text-2xl font-black">
                  📍 Endereço de entrega
                </h3>

                <p className="mt-3 text-sm leading-7 text-gray-400">

                  Cadastre seu endereço uma única vez.

                  Ele ficará salvo para seus próximos pedidos.

                </p>

              </div>

              {/* CARREGAMENTO */}

              {carregandoEndereco && (

                <div className="p-8 text-center text-sm text-purple-300">

                  Carregando endereço...

                </div>

              )}

              {/* =====================================
                  ENDEREÇO SALVO
              ===================================== */}

              {!carregandoEndereco &&
                enderecoSalvo &&
                !editandoEndereco && (

                <div className="p-6 sm:p-9">

                  <div className="rounded-2xl border border-green-500/30 bg-green-500/5 p-5">

                    <span className="inline-block rounded-full bg-green-500/10 px-4 py-2 text-xs font-bold text-green-400">
                      ✓ Endereço cadastrado
                    </span>

                    <h4 className="mt-5 text-lg font-black">
                      {parceiro.empresa}
                    </h4>

                    <div className="mt-5 space-y-2 text-sm leading-7 text-gray-300">

                      <p>
                        {endereco.rua},{" "}
                        {endereco.numero}
                      </p>

                      <p>
                        {endereco.bairro}
                      </p>

                      <p>
                        {endereco.cidade} -{" "}
                        {endereco.estado}
                      </p>

                      <p>
                        CEP: {endereco.cep}
                      </p>

                      {endereco.complemento && (

                        <p>
                          Complemento:{" "}
                          {endereco.complemento}
                        </p>

                      )}

                      {endereco.referencia && (

                        <p>
                          Referência:{" "}
                          {endereco.referencia}
                        </p>

                      )}

                    </div>

                    {/* GPS */}

                    {endereco.localizacao && (

                      <div className="mt-6 rounded-xl border border-green-500/20 bg-black/20 p-4">

                        <p className="text-sm font-bold text-green-400">
                          ✓ Localização GPS cadastrada
                        </p>

                        <p className="mt-2 text-xs text-gray-400">
                          Ponto fixo de entrega salvo.
                        </p>

                      </div>

                    )}

                    {/* MAPA */}

                    {mapa && (

                      <a
                        href={mapa}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-5 flex w-full items-center justify-center rounded-xl bg-blue-600 px-5 py-4 text-center text-sm font-bold transition hover:bg-blue-500"
                      >
                        🗺️ Conferir localização no Maps
                      </a>

                    )}

                    {/* EDITAR */}

                    <button
                      type="button"
                      onClick={() => {
                        setEditandoEndereco(true);

                        setMensagemEndereco("");
                      }}
                      disabled={enviando}
                      className="mt-4 w-full rounded-xl border border-purple-500/40 px-5 py-4 text-sm font-bold text-purple-300 transition hover:bg-purple-500/10"
                    >
                      ✏️ Editar endereço
                    </button>

                  </div>

                </div>

              )}

              {/* =====================================
                  FORMULÁRIO DO ENDEREÇO
              ===================================== */}

              {!carregandoEndereco &&
                editandoEndereco && (

                <div className="p-6 sm:p-9">

                  <h4 className="text-lg font-black">

                    {enderecoSalvo
                      ? "Atualizar endereço"
                      : "Cadastrar endereço"}

                  </h4>

                  <p className="mt-3 text-sm leading-7 text-gray-400">

                    Preencha os dados e capture
                    a localização do estabelecimento.

                  </p>

                  {/* CAMPOS */}

                  <div className="mt-7 grid gap-5 sm:grid-cols-2">

                    {/* CEP */}

                    <div>

                      <label
                        htmlFor="cep"
                        className={labelClasse}
                      >
                        CEP *
                      </label>

                      <div className="flex gap-2">

                        <input
                          id="cep"
                          type="text"
                          inputMode="numeric"
                          placeholder="00000-000"
                          maxLength={9}
                          value={endereco.cep}
                          onChange={(e) =>
                            alterarEndereco(
                              "cep",
                              e.target.value
                            )
                          }
                          disabled={salvandoEndereco}
                          className={`${campoClasse} min-w-0`}
                        />

                        <button
                          type="button"
                          onClick={consultarCep}
                          disabled={
                            buscandoCep ||
                            salvandoEndereco
                          }
                          className="shrink-0 rounded-xl bg-purple-600 px-3 text-xs font-bold disabled:opacity-50"
                        >
                          {buscandoCep
                            ? "..."
                            : "Buscar"}
                        </button>

                      </div>

                    </div>

                    {/* RUA */}

                    <div>

                      <label
                        htmlFor="rua"
                        className={labelClasse}
                      >
                        Rua / Avenida *
                      </label>

                      <input
                        id="rua"
                        type="text"
                        value={endereco.rua}
                        onChange={(e) =>
                          alterarEndereco(
                            "rua",
                            e.target.value
                          )
                        }
                        placeholder="Nome da rua"
                        disabled={salvandoEndereco}
                        className={campoClasse}
                      />

                    </div>

                    {/* NÚMERO */}

                    <div>

                      <label
                        htmlFor="numero"
                        className={labelClasse}
                      >
                        Número *
                      </label>

                      <input
                        id="numero"
                        type="text"
                        value={endereco.numero}
                        onChange={(e) =>
                          alterarEndereco(
                            "numero",
                            e.target.value
                          )
                        }
                        placeholder="123 ou S/N"
                        disabled={salvandoEndereco}
                        className={campoClasse}
                      />

                    </div>

                    {/* BAIRRO */}

                    <div>

                      <label
                        htmlFor="bairro"
                        className={labelClasse}
                      >
                        Bairro *
                      </label>

                      <input
                        id="bairro"
                        type="text"
                        value={endereco.bairro}
                        onChange={(e) =>
                          alterarEndereco(
                            "bairro",
                            e.target.value
                          )
                        }
                        placeholder="Seu bairro"
                        disabled={salvandoEndereco}
                        className={campoClasse}
                      />

                    </div>

                    {/* CIDADE */}

                    <div>

                      <label
                        htmlFor="cidade"
                        className={labelClasse}
                      >
                        Cidade *
                      </label>

                      <input
                        id="cidade"
                        type="text"
                        value={endereco.cidade}
                        onChange={(e) =>
                          alterarEndereco(
                            "cidade",
                            e.target.value
                          )
                        }
                        placeholder="Sua cidade"
                        disabled={salvandoEndereco}
                        className={campoClasse}
                      />

                    </div>

                    {/* ESTADO */}

                    <div>

                      <label
                        htmlFor="estado"
                        className={labelClasse}
                      >
                        Estado (UF) *
                      </label>

                      <input
                        id="estado"
                        type="text"
                        maxLength={2}
                        value={endereco.estado}
                        onChange={(e) =>
                          alterarEndereco(
                            "estado",
                            e.target.value.toUpperCase()
                          )
                        }
                        placeholder="GO"
                        disabled={salvandoEndereco}
                        className={`${campoClasse} uppercase`}
                      />

                    </div>

                    {/* COMPLEMENTO */}

                    <div>

                      <label
                        htmlFor="complemento"
                        className={labelClasse}
                      >
                        Complemento
                      </label>

                      <input
                        id="complemento"
                        type="text"
                        value={endereco.complemento}
                        onChange={(e) =>
                          alterarEndereco(
                            "complemento",
                            e.target.value
                          )
                        }
                        placeholder="Sala, loja..."
                        disabled={salvandoEndereco}
                        className={campoClasse}
                      />

                    </div>

                    {/* REFERÊNCIA */}

                    <div>

                      <label
                        htmlFor="referencia"
                        className={labelClasse}
                      >
                        Ponto de referência
                      </label>

                      <input
                        id="referencia"
                        type="text"
                        value={endereco.referencia}
                        onChange={(e) =>
                          alterarEndereco(
                            "referencia",
                            e.target.value
                          )
                        }
                        placeholder="Próximo à praça..."
                        disabled={salvandoEndereco}
                        className={campoClasse}
                      />

                    </div>

                  </div>

                  {/* =====================================
                      GPS
                  ===================================== */}

                  <div className="mt-8 rounded-2xl border border-green-500/25 bg-[#10200b]/20 p-5">

                    <h4 className="text-lg font-black">
                      📍 Localização do estabelecimento
                    </h4>

                    <p className="mt-3 text-sm leading-7 text-gray-400">

                      Este recurso captura sua posição
                      atual e salva um ponto fixo de entrega.

                      Esteja no estabelecimento antes
                      de continuar.

                    </p>

                    <p className="mt-3 text-xs leading-6 text-gray-500">

                      O navegador solicitará sua permissão.
                      Sua localização será compartilhada
                      com a equipe para organizar a entrega.

                    </p>

                    {/* BOTÃO GPS */}

                    <button
                      type="button"
                      onClick={capturarLocalizacao}
                      disabled={
                        capturandoGPS ||
                        salvandoEndereco
                      }
                      className="mt-6 w-full rounded-xl bg-green-600 px-5 py-4 text-sm font-black transition hover:bg-green-500 disabled:opacity-50"
                    >

                      {capturandoGPS
                        ? "Obtendo localização..."
                        : endereco.localizacao
                        ? "📍 Atualizar localização GPS"
                        : "📍 Capturar minha localização"}

                    </button>

                    {/* COORDENADAS */}

                    {endereco.localizacao && (

                      <div className="mt-5 rounded-xl border border-green-500/20 bg-black/30 p-4">

                        <p className="text-sm font-bold text-green-400">
                          ✓ GPS capturado
                        </p>

                        <p className="mt-3 break-all text-xs text-gray-400">

                          Latitude:{" "}

                          {endereco.localizacao.latitude}

                        </p>

                        <p className="mt-2 break-all text-xs text-gray-400">

                          Longitude:{" "}

                          {endereco.localizacao.longitude}

                        </p>

                        <p className="mt-2 text-xs text-gray-400">

                          Precisão estimada:{" "}

                          {Math.round(
                            endereco.localizacao.precisaoMetros
                          )}{" "}

                          metros

                        </p>

                        {mapa && (

                          <a
                            href={mapa}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="mt-5 block rounded-xl border border-blue-500/30 bg-blue-500/10 px-5 py-4 text-center text-sm font-bold text-blue-300"
                          >
                            🗺️ Conferir ponto no Google Maps
                          </a>

                        )}

                      </div>

                    )}

                  </div>

                  {/* ERROS */}

                  {erroEndereco && (

                    <div
                      role="alert"
                      className="mt-6 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm leading-7 text-red-300"
                    >
                      {erroEndereco}
                    </div>

                  )}

                  {/* SALVAR */}

                  <button
                    type="button"
                    onClick={salvarEndereco}
                    disabled={
                      salvandoEndereco ||
                      capturandoGPS ||
                      buscandoCep
                    }
                    className="mt-7 w-full rounded-xl bg-purple-600 px-6 py-5 font-black transition hover:bg-purple-500 disabled:opacity-50"
                  >

                    {salvandoEndereco
                      ? "Salvando endereço..."
                      : "✓ Salvar endereço e localização"}

                  </button>

                </div>

              )}

              {/* MENSAGEM */}

              {mensagemEndereco && (

                <div
                  role="status"
                  className="mx-6 mb-6 rounded-xl border border-green-500/20 bg-green-500/10 p-4 text-sm leading-7 text-green-300 sm:mx-9"
                >
                  {mensagemEndereco}
                </div>

              )}

            </div>

            {/* =====================================
                PAGAMENTO
            ===================================== */}

            <div className="rounded-[28px] border border-purple-500/20 bg-[#21112f] p-6 sm:p-9">

              <span className="text-xs font-bold uppercase tracking-[3px] text-purple-400">
                Etapa 03
              </span>

              <h3 className="mt-4 text-2xl font-black">
                Forma de pagamento
              </h3>

              <p className="mt-3 text-sm leading-7 text-gray-400">

                Selecione como prefere pagar após
                a confirmação dos valores pela equipe.

              </p>

              <div className="mt-7 space-y-3">

                {[
                  "PIX",
                  "Cartão",
                  "Dinheiro",
                ].map((forma) => (

                  <label
                    key={forma}
                    className={`flex cursor-pointer items-center gap-4 rounded-xl border p-4 transition ${
                      formaPagamento === forma
                        ? "border-purple-500 bg-purple-500/20"
                        : "border-purple-500/20 bg-[#100719]"
                    }`}
                  >

                    <input
                      type="radio"
                      name="pagamento"
                      value={forma}
                      checked={
                        formaPagamento === forma
                      }
                      onChange={() =>
                        setFormaPagamento(forma)
                      }
                      disabled={enviando}
                      className="accent-purple-600"
                    />

                    <span className="text-sm font-bold">
                      {forma}
                    </span>

                  </label>

                ))}

              </div>

              {/* OBSERVAÇÕES */}

              <div className="mt-7">

                <label
                  htmlFor="observacao"
                  className={labelClasse}
                >
                  Observações
                </label>

                <textarea
                  id="observacao"
                  rows={4}
                  value={observacao}
                  onChange={(e) =>
                    setObservacao(e.target.value)
                  }
                  placeholder="Alguma informação importante sobre a entrega?"
                  disabled={enviando}
                  className={`${campoClasse} resize-none`}
                />

              </div>

            </div>

            {/* =====================================
                RESUMO
            ===================================== */}

            <div className="rounded-[28px] border border-purple-500/30 bg-gradient-to-br from-[#301347] to-[#160b22] p-6 sm:p-9">

              <h3 className="text-2xl font-black">
                Resumo do pedido
              </h3>

              <div className="mt-7 space-y-5 text-sm">

                <div className="flex justify-between gap-4">

                  <span className="text-gray-400">
                    Produto
                  </span>

                  <span className="font-bold">
                    Barra de Açaí
                  </span>

                </div>

                <div className="flex justify-between gap-4">

                  <span className="text-gray-400">
                    Quantidade
                  </span>

                  <span className="font-bold">
                    {quantidade}
                  </span>

                </div>

                <div className="flex justify-between gap-4">

                  <span className="text-gray-400">
                    Pagamento
                  </span>

                  <span className="font-bold">
                    {formaPagamento || "Não selecionado"}
                  </span>

                </div>

                <div className="flex justify-between gap-4">

                  <span className="text-gray-400">
                    Endereço
                  </span>

                  <span
                    className={`text-right font-bold ${
                      enderecoConfirmado
                        ? "text-green-400"
                        : "text-yellow-400"
                    }`}
                  >

                    {enderecoConfirmado
                      ? "✓ Confirmado"
                      : "Pendente"}

                  </span>

                </div>

                <div className="flex justify-between gap-4">

                  <span className="text-gray-400">
                    Localização
                  </span>

                  <span
                    className={`text-right font-bold ${
                      enderecoConfirmado &&
                      endereco.localizacao
                        ? "text-green-400"
                        : "text-yellow-400"
                    }`}
                  >

                    {enderecoConfirmado &&
                    endereco.localizacao
                      ? "✓ GPS salvo"
                      : "Aguardando"}

                  </span>

                </div>

              </div>

              <div className="mt-7 border-t border-purple-500/30 pt-6">

                <p className="text-sm leading-7 text-gray-300">

                  O valor será informado pela nossa
                  equipe após a análise da solicitação.

                </p>

              </div>

              {/* CONFIRMAR */}

              <button
                type="submit"
                disabled={
                  enviando ||
                  !enderecoConfirmado ||
                  !formaPagamento ||
                  carregandoEndereco
                }
                className="mt-8 w-full rounded-xl bg-purple-600 px-6 py-5 text-base font-black shadow-xl shadow-purple-900/30 transition hover:bg-purple-500 disabled:cursor-not-allowed disabled:bg-purple-900 disabled:text-gray-400"
              >

                {enviando
                  ? "Enviando pedido..."
                  : "Confirmar solicitação →"}

              </button>

              {!enderecoConfirmado && (

                <p className="mt-5 text-center text-xs leading-6 text-yellow-300">

                  Salve seu endereço e localização
                  para liberar a confirmação.

                </p>

              )}

              <p className="mt-5 text-center text-xs leading-6 text-gray-400">

                Seus dados de entrega serão encaminhados
                para nossa equipe administrativa.

              </p>

            </div>

          </form>

        </div>

      </section>

      {/* =====================================
          RODAPÉ
      ===================================== */}

      <footer className="border-t border-purple-500/20 bg-black px-5 py-10 text-center">

        <h2 className="text-xl font-black">

          AÇAÍ DO{" "}

          <span className="text-purple-400">
            BRUXO
          </span>

        </h2>

        <p className="mt-2 text-[10px] uppercase tracking-[2px] text-purple-300">
          Portal exclusivo de parceiros
        </p>

        <p className="mt-6 text-xs text-gray-600">

          © {new Date().getFullYear()} Açaí do Bruxo.

        </p>

      </footer>

    </main>
  );
}