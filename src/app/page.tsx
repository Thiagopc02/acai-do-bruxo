
"use client";

import Image from "next/image";
import Link from "next/link";

// ==========================================
// IMAGENS DA HISTÓRIA
// ==========================================

const historia = [
  {
    numero: "01",
    titulo: "As raízes amazônicas",
    imagem: "/pe1.png",
    alt: "Ilustração das raízes amazônicas do açaí",
    descricao:
      "O açaizeiro é uma palmeira nativa da região amazônica. Seu fruto é consumido há muito tempo por comunidades da região e possui forte ligação com a alimentação e as tradições locais.",
  },
  {
    numero: "02",
    titulo: "Da tradição à mesa",
    imagem: "/tradicao1.png",
    alt: "Ilustração da tradição do açaí na alimentação amazônica",
    descricao:
      "Na região Norte, o açaí é tradicionalmente consumido de diferentes maneiras, inclusive acompanhado de farinha de mandioca e outros alimentos. Um costume que demonstra sua importância cultural e alimentar.",
  },
  {
    numero: "03",
    titulo: "A conquista de novos mercados",
    imagem: "/mundo1.png",
    alt: "Ilustração da expansão do açaí para novos mercados",
    descricao:
      "Com o passar do tempo, o açaí conquistou consumidores em outras regiões do país e também no exterior. Novas formas de preparo e apresentação ampliaram suas possibilidades de consumo.",
  },
];

// ==========================================
// ETAPAS DO PORTAL
// ==========================================

const etapas = [
  {
    numero: "01",
    titulo: "Cadastre-se",
    descricao:
      "Solicite seu acesso ao nosso portal exclusivo de parceiros.",
  },
  {
    numero: "02",
    titulo: "Escolha sua quantidade",
    descricao:
      "Após a aprovação, selecione a quantidade de barras desejada.",
  },
  {
    numero: "03",
    titulo: "Receba seu pedido",
    descricao:
      "Informe seu endereço e acompanhe o andamento da entrega.",
  },
];

// ==========================================
// PÁGINA PRINCIPAL
// ==========================================

export default function Home() {
  return (
    <main className="min-h-screen overflow-x-clip bg-[#0d0613] text-white">

      {/* =====================================
          CABEÇALHO
      ===================================== */}

      <header className="fixed inset-x-0 top-0 z-50 border-b border-purple-500/20 bg-black">

        <div className="mx-auto flex h-[76px] max-w-7xl items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">

          {/* LOGO */}

          <a
            href="#inicio"
            aria-label="Açaí do Bruxo - Página inicial"
            className="flex min-w-0 flex-col justify-center"
          >

            <span className="whitespace-nowrap text-base font-black leading-none tracking-tight sm:text-2xl">

              AÇAÍ DO{" "}

              <span className="text-purple-400">
                BRUXO
              </span>

            </span>

            <span className="mt-1 text-[6px] font-bold tracking-[1px] text-purple-300 sm:text-[8px] sm:tracking-[2px]">

              UMA EXPERIÊNCIA DE OUTRO MUNDO

            </span>

          </a>

          {/* LOGIN FUNCIONAL */}

          <Link
            href="/login"
            className="shrink-0 rounded-xl bg-purple-600 px-4 py-3 text-center text-xs font-bold text-white shadow-lg shadow-purple-900/30 transition hover:bg-purple-500 sm:px-8 sm:text-sm"
          >

            Faça seu login

          </Link>

        </div>

      </header>

      {/* =====================================
          APRESENTAÇÃO INICIAL
      ===================================== */}

      <section
        id="inicio"
        className="relative flex min-h-screen items-center overflow-hidden px-5 pb-20 pt-36 sm:px-6 lg:pt-28"
      >

        {/* ILUMINAÇÃO */}

        <div className="pointer-events-none absolute -left-32 top-32 h-96 w-96 rounded-full bg-purple-700/20 blur-[130px]" />

        <div className="pointer-events-none absolute -right-20 bottom-0 h-96 w-96 rounded-full bg-fuchsia-700/20 blur-[130px]" />

        <div className="relative mx-auto grid w-full max-w-7xl items-center gap-10 lg:grid-cols-2 lg:gap-16">

          {/* TEXTO */}

          <div className="text-center lg:text-left">

            <span className="inline-block max-w-full rounded-full border border-purple-500/40 bg-purple-500/10 px-4 py-3 text-[10px] font-bold uppercase tracking-[2px] text-purple-300 sm:px-5 sm:text-xs">

              Bem-vindo ao universo do Bruxo

            </span>

            <h1 className="mt-8 text-[clamp(2.65rem,8vw,4.7rem)] font-black leading-[1.06] tracking-tight">

              MUITO MAIS
              <br />

              QUE AÇAÍ.
              <br />

              <span className="bg-gradient-to-r from-purple-400 via-fuchsia-400 to-purple-600 bg-clip-text text-transparent">

                UMA MAGIA.

              </span>

            </h1>

            <p className="mx-auto mt-7 max-w-xl text-base leading-relaxed text-gray-400 lg:mx-0 lg:text-lg">

              Uma fruta que carrega história, tradição e cultura.

              Conheça o universo do Açaí do Bruxo e descubra
              como fazer parte da nossa rede de parceiros.

            </p>

            {/* BOTÕES */}

            <div className="mt-9 flex flex-col justify-center gap-4 sm:flex-row lg:justify-start">

              <a
                href="#historia"
                className="rounded-2xl bg-purple-600 px-7 py-4 text-center text-sm font-bold shadow-xl shadow-purple-900/30 transition hover:-translate-y-1 hover:bg-purple-500 sm:text-base"
              >

                Descubra essa história ↓

              </a>

              <a
                href="#parceiros"
                className="rounded-2xl border border-purple-500/50 px-7 py-4 text-center text-sm font-bold transition hover:bg-purple-900/30 sm:text-base"
              >

                Seja nosso parceiro

              </a>

            </div>

          </div>

          {/* =====================================
              EMBALAGEM FLUTUANTE
          ===================================== */}

          <div className="relative flex min-h-[430px] items-center justify-center sm:min-h-[530px] lg:min-h-[650px]">

            {/* LUZ VERDE */}

            <div className="pointer-events-none absolute h-[260px] w-[260px] rounded-full bg-[#65ff00]/35 blur-[90px] sm:h-[380px] sm:w-[380px] sm:blur-[120px]" />

            {/* LUZ ROXA */}

            <div className="pointer-events-none absolute h-[320px] w-[320px] rounded-full bg-purple-700/20 blur-[110px] sm:h-[450px] sm:w-[450px]" />

            {/* CÍRCULOS */}

            <div className="pointer-events-none absolute h-[290px] w-[290px] rounded-full border border-[#80ff00]/15 sm:h-[440px] sm:w-[440px]" />

            <div className="pointer-events-none absolute h-[230px] w-[230px] rounded-full border border-purple-400/10 sm:h-[350px] sm:w-[350px]" />

            {/* PRODUTO */}

            <div className="produto-flutuante relative z-10 flex w-full items-center justify-center">

              <Image
                src="/acai-macunaima.png"
                alt="Embalagem de açaí Macunaíma"
                width={550}
                height={740}
                priority
                sizes="(max-width: 640px) 290px, (max-width: 1024px) 390px, 480px"
                className="h-auto w-[290px] max-w-full object-contain drop-shadow-[0_0_35px_rgba(100,255,0,0.5)] sm:w-[390px] lg:w-[480px]"
              />

            </div>

            {/* SELO INFERIOR */}

            <div className="absolute bottom-0 left-1/2 z-20 -translate-x-1/2 whitespace-nowrap rounded-full border border-[#80ff00]/30 bg-[#10200b]/80 px-4 py-3 text-center text-[9px] font-bold tracking-[1px] text-[#b6ff87] backdrop-blur-xl sm:px-6 sm:text-xs sm:tracking-[2px]">

              DIRETO PARA NOSSOS PARCEIROS

            </div>

          </div>

        </div>

      </section>

      {/* =====================================
          HISTÓRIA DO AÇAÍ
      ===================================== */}

      <section
        id="historia"
        className="scroll-mt-20 border-t border-purple-500/10 bg-[#160b22] px-5 py-20 sm:px-6 lg:py-24"
      >

        <div className="mx-auto max-w-7xl">

          {/* TÍTULO */}

          <div className="mx-auto mb-14 max-w-3xl text-center">

            <span className="text-xs font-bold uppercase tracking-[3px] text-purple-400">

              Muito antes de conquistar o mundo

            </span>

            <h2 className="mt-5 text-4xl font-black sm:text-5xl lg:text-6xl">

              A HISTÓRIA
              <br />

              <span className="text-purple-400">

                DO AÇAÍ.

              </span>

            </h2>

            <p className="mt-7 leading-8 text-gray-400">

              Muito antes de se tornar conhecido em diversas
              regiões do Brasil, o açaí já fazia parte
              da alimentação e da cultura de populações
              amazônicas.

              Uma história que começa na floresta
              e atravessa gerações.

            </p>

          </div>

          {/* =====================================
              CARDS DA HISTÓRIA
          ===================================== */}

          <div className="grid gap-6 md:grid-cols-3">

            {historia.map((item) => (

              <article
                key={item.numero}
                className="group relative flex h-full flex-col overflow-hidden rounded-3xl border border-purple-500/20 bg-[#21112f] p-5 transition duration-300 hover:-translate-y-2 hover:border-purple-400/60 hover:shadow-[0_20px_60px_rgba(126,34,206,0.15)] sm:p-7"
              >

                {/* IMAGEM */}

                <div className="relative mb-7 flex h-[190px] w-full items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-br from-[#301347] via-[#271039] to-[#180b25] sm:h-[220px] md:h-[180px] lg:h-[220px]">

                  <div className="pointer-events-none absolute h-32 w-32 rounded-full bg-purple-500/25 blur-[55px]" />

                  <div className="relative z-10 flex h-full w-full items-center justify-center p-2 sm:p-3">

                    <Image
                      src={item.imagem}
                      alt={item.alt}
                      width={500}
                      height={500}
                      sizes="(max-width: 767px) 80vw, (max-width: 1023px) 30vw, 350px"
                      className="h-full w-full object-contain drop-shadow-[0_12px_22px_rgba(168,85,247,0.3)] transition duration-500 group-hover:scale-105"
                    />

                  </div>

                </div>

                {/* CAPÍTULO */}

                <span className="text-xs font-bold uppercase tracking-[3px] text-purple-400">

                  Capítulo {item.numero}

                </span>

                <h3 className="mt-4 text-xl font-black leading-tight sm:text-2xl">

                  {item.titulo}

                </h3>

                <p className="mt-5 text-sm leading-7 text-gray-400">

                  {item.descricao}

                </p>

                <div className="mt-auto pt-8">

                  <div className="h-[2px] w-12 rounded-full bg-gradient-to-r from-purple-500 to-fuchsia-400 transition-all duration-300 group-hover:w-full" />

                </div>

              </article>

            ))}

          </div>

          {/* =====================================
              UMA HISTÓRIA QUE CONTINUA
          ===================================== */}

          <div className="relative mt-16 overflow-hidden rounded-[35px] border border-purple-500/20 bg-gradient-to-br from-[#300e47] via-[#241032] to-[#100719] px-5 pb-10 pt-12 text-center sm:px-10 md:pb-14 md:pt-16">

            {/* LUZ */}

            <div className="pointer-events-none absolute left-1/2 top-8 h-64 w-64 -translate-x-1/2 rounded-full bg-purple-600/25 blur-[100px] md:h-80 md:w-80" />

            {/* ILUSTRAÇÃO */}

            <div className="relative z-10 mx-auto flex w-full max-w-3xl items-center justify-center">

              <Image
                src="/uma-historia.png"
                alt="Ilustração do universo do Açaí do Bruxo com um bruxo, crianças e frutos de açaí"
                width={1200}
                height={800}
                sizes="(max-width: 768px) 90vw, 680px"
                className="historia-flutuante h-auto w-full max-w-[680px] object-contain drop-shadow-[0_20px_40px_rgba(168,85,247,0.3)]"
              />

            </div>

            {/* TEXTO */}

            <div className="relative z-10 mx-auto mt-5 max-w-3xl">

              <span className="text-xs font-bold uppercase tracking-[3px] text-purple-300">

                A magia continua

              </span>

              <h3 className="mt-5 text-3xl font-black leading-tight sm:text-4xl md:text-5xl">

                Uma história
                <br />

                <span className="bg-gradient-to-r from-purple-300 via-fuchsia-400 to-purple-500 bg-clip-text text-transparent">

                  que continua.

                </span>

              </h3>

              <p className="mx-auto mt-7 max-w-2xl text-sm leading-7 text-gray-300 sm:text-base sm:leading-8">

                O açaí continua atravessando fronteiras,
                ganhando novas apresentações e conectando
                pessoas por meio da alimentação.

                É dessa história que nasce nossa inspiração
                para o universo do Açaí do Bruxo.

              </p>

              <a
                href="#essencia"
                className="mt-9 inline-block rounded-xl border border-purple-500/40 bg-purple-600/20 px-7 py-4 text-sm font-bold transition hover:border-purple-400 hover:bg-purple-600"
              >

                Conheça nosso universo ↓

              </a>

            </div>

          </div>

        </div>

      </section>

      {/* =====================================
          NOSSA ESSÊNCIA
      ===================================== */}

      <section
        id="essencia"
        className="scroll-mt-20 px-5 py-20 sm:px-6 lg:py-24"
      >

        <div className="mx-auto grid max-w-7xl items-center gap-14 lg:grid-cols-2">

          {/* =====================================
              MAGO
          ===================================== */}

          <div className="relative isolate flex min-h-[440px] items-center justify-center overflow-hidden rounded-[40px] border border-purple-500/20 bg-gradient-to-br from-[#351050] via-[#220e35] to-[#100719] px-4 pb-10 pt-6 sm:min-h-[550px] sm:px-8 lg:min-h-[630px]">

            {/* LUZ ROXA */}

            <div className="pointer-events-none absolute left-1/2 top-1/2 h-[280px] w-[280px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-purple-600/35 blur-[90px] sm:h-[400px] sm:w-[400px]" />

            {/* BRILHO VERDE */}

            <div className="pointer-events-none absolute bottom-[12%] left-1/2 h-[170px] w-[240px] -translate-x-1/2 rounded-full bg-[#80ff00]/10 blur-[80px] sm:h-[220px] sm:w-[300px]" />

            {/* CÍRCULOS */}

            <div className="pointer-events-none absolute left-1/2 top-1/2 h-[310px] w-[310px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-purple-400/15 sm:h-[430px] sm:w-[430px]" />

            <div className="pointer-events-none absolute left-1/2 top-1/2 h-[240px] w-[240px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-purple-400/10 sm:h-[350px] sm:w-[350px]" />

            {/* PERSONAGEM */}

            <div className="mago-flutuante relative z-10 flex w-full items-center justify-center">

              <Image
                src="/mago.png"
                alt="Mago do Açaí do Bruxo segurando uma varinha mágica e frutos de açaí"
                width={1122}
                height={1402}
                sizes="(max-width: 640px) 280px, (max-width: 1024px) 350px, 430px"
                className="h-auto w-[260px] max-w-full object-contain drop-shadow-[0_20px_45px_rgba(168,85,247,0.45)] sm:w-[350px] lg:w-[410px]"
              />

            </div>

            {/* SELO */}

            <div className="absolute bottom-5 left-1/2 z-20 -translate-x-1/2 whitespace-nowrap rounded-full border border-purple-400/25 bg-[#14091e]/80 px-5 py-3 text-[9px] font-bold tracking-[2px] text-purple-200 backdrop-blur-xl sm:bottom-8 sm:text-xs">

              NOSSO UNIVERSO

            </div>

          </div>

          {/* TEXTO */}

          <div>

            <span className="text-xs font-bold uppercase tracking-[3px] text-purple-400">

              Conheça nossa essência

            </span>

            <h2 className="mt-5 text-4xl leading-tight font-black lg:text-5xl">

              UMA MARCA.
              <br />

              <span className="text-purple-400">

                UM UNIVERSO
                <br />
                DE POSSIBILIDADES.

              </span>

            </h2>

            <p className="mt-8 leading-8 text-gray-400">

              O Açaí do Bruxo traz uma identidade
              inspirada na magia e na versatilidade
              de um dos frutos mais conhecidos
              da Amazônia.

              Nossa proposta é conectar o produto
              aos negócios que desejam trabalhar
              com açaí, oferecendo um canal direto
              de relacionamento e pedidos.

            </p>

            <p className="mt-5 leading-8 text-gray-400">

              Por meio do nosso portal exclusivo,
              buscamos tornar o processo de compra
              mais organizado e prático para os parceiros.

              Cada etapa foi pensada para facilitar
              a comunicação, o envio de pedidos
              e o acompanhamento das entregas.

            </p>

            <a
              href="#parceiros"
              className="mt-9 inline-block rounded-xl bg-purple-600 px-8 py-4 font-bold transition hover:bg-purple-500"
            >

              Conheça nossas parcerias →

            </a>

          </div>

        </div>

      </section>

      {/* =====================================
          PARCEIROS
      ===================================== */}

      <section
        id="parceiros"
        className="scroll-mt-20 border-y border-purple-500/10 bg-[#170a25] px-5 py-20 sm:px-6 lg:py-24"
      >

        <div className="mx-auto max-w-6xl text-center">

          <span className="text-xs font-bold uppercase tracking-[3px] text-purple-400">

            Faça parte desse universo

          </span>

          <h2 className="mt-6 text-4xl font-black sm:text-5xl lg:text-6xl">

            SEJA UM PARCEIRO
            <br />

            <span className="text-purple-400">

              DO BRUXO.

            </span>

          </h2>

          <p className="mx-auto mt-7 max-w-2xl leading-8 text-gray-400">

            Quer trabalhar com nossas barras de açaí?

            Estamos desenvolvendo um espaço exclusivo
            para facilitar seus pedidos, organizar
            suas entregas e acompanhar suas compras
            em um só lugar.

          </p>

          {/* ETAPAS */}

          <div className="mt-14 grid gap-6 text-left md:grid-cols-3">

            {etapas.map((item) => (

              <div
                key={item.numero}
                className="rounded-3xl border border-purple-500/20 bg-[#251035] p-8 transition hover:border-purple-500/50"
              >

                <span className="text-5xl font-black text-purple-500/40">

                  {item.numero}

                </span>

                <h3 className="mt-7 text-xl font-black">

                  {item.titulo}

                </h3>

                <p className="mt-4 text-sm leading-7 text-gray-400">

                  {item.descricao}

                </p>

              </div>

            ))}

          </div>

          {/* ACESSAR PORTAL */}

          <Link
            href="/login"
            className="mt-12 inline-block rounded-2xl bg-purple-600 px-8 py-5 font-bold shadow-xl shadow-purple-900/40 transition hover:-translate-y-1 hover:bg-purple-500 sm:px-10"
          >

            Acessar portal de parceiros →

          </Link>

        </div>

      </section>

      {/* =====================================
          CONTATO
      ===================================== */}

      <section className="px-5 py-20 sm:px-6">

        <div className="mx-auto max-w-4xl text-center">

          <span className="text-xs font-bold uppercase tracking-[3px] text-purple-400">

            Vamos conversar?

          </span>

          <h2 className="mt-5 text-3xl font-black sm:text-4xl lg:text-5xl">

            O PRÓXIMO PASSO
            <br />

            COMEÇA AQUI.

          </h2>

          <p className="mx-auto mt-6 max-w-2xl leading-8 text-gray-400">

            Interessado em fazer parte do Açaí do Bruxo?

            Estamos preparando um espaço exclusivo
            para cadastro e pedidos dos nossos parceiros.

            Se você já possui acesso autorizado,
            entre no portal utilizando suas credenciais.

          </p>

          {/* BOTÃO DE ACESSO */}

          <Link
            href="/login"
            className="mt-9 inline-block rounded-2xl border border-purple-500 px-9 py-4 font-bold transition hover:bg-purple-900/30"
          >

            Já sou parceiro — Fazer login →

          </Link>

        </div>

      </section>

      {/* =====================================
          SELO PRODUTO ORGÂNICO
      ===================================== */}

      <section
        aria-label="Selo de produto orgânico"
        className="relative overflow-hidden border-t border-purple-500/10 bg-[#100719] px-5 py-16 sm:px-6 lg:py-20"
      >

        <div className="pointer-events-none absolute left-1/2 top-1/2 h-64 w-64 -translate-x-1/2 -translate-y-1/2 rounded-full bg-green-700/10 blur-[100px]" />

        <div className="relative mx-auto flex max-w-5xl flex-col items-center gap-6 text-center">

          {/* SELO */}

          <div className="flex w-full items-center justify-center">

            <Image
              src="/oganico.png"
              alt="Selo Produto Orgânico Brasil"
              width={1122}
              height={600}
              sizes="(max-width: 640px) 220px, 300px"
              className="h-auto w-[220px] max-w-full object-contain drop-shadow-[0_12px_35px_rgba(34,197,94,0.15)] sm:w-[300px]"
            />

          </div>

          <p className="max-w-2xl text-sm leading-7 text-gray-400">

            Conheça nosso universo e descubra como fazer parte
            da rede de parceiros do Açaí do Bruxo.

          </p>

        </div>

      </section>

      {/* =====================================
          RODAPÉ
      ===================================== */}

      <footer className="border-t border-purple-500/20 bg-black px-5 py-12 sm:px-6">

        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-6 text-center md:flex-row md:text-left">

          {/* MARCA */}

          <div>

            <h2 className="text-2xl font-black">

              AÇAÍ DO{" "}

              <span className="text-purple-400">

                BRUXO

              </span>

            </h2>

            <p className="mt-2 text-xs tracking-[2px] text-purple-300">

              UMA EXPERIÊNCIA DE OUTRO MUNDO

            </p>

          </div>

          {/* PORTAL */}

          <Link
            href="/login"
            className="rounded-xl border border-purple-500/40 px-6 py-3 text-sm font-bold text-purple-300 transition hover:bg-purple-600 hover:text-white"
          >

            Portal de parceiros →

          </Link>

        </div>

        <div className="mx-auto mt-10 max-w-7xl border-t border-purple-500/10 pt-8 text-center">

          <p className="text-xs text-gray-600">

            © {new Date().getFullYear()} Açaí do Bruxo.
            Todos os direitos reservados.

          </p>

        </div>

      </footer>

    </main>
  );
}