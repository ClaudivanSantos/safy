export type Locale = "en" | "pt-BR";

type TranslationTree = {
  [key: string]: string | TranslationTree;
};

export const translations: Record<Locale, TranslationTree> = {
  en: {
    common: {
      donateTitle: "Support the project",
      donateShort: "☕",
      donateLong: "☕ Donate",
      disconnectShort: "Logout",
      disconnectLong: "Disconnect",
      connectTitle: "Connect wallet",
      connect: "Connect",
      login: "Login",
      langToggleTitle: "Change language",
      langShortEn: "EN",
      langShortPt: "PT",
      userMenuAria: "User menu",
      loggedInAs: "Logged in as",
      userFallback: "User",
    },
    nav: {
      dashboard: "DeFi",
      wallet: "Wallet",
      averagePrice: "Average price",
      pools: "Pools",
      defiHealth: "DeFi Health",
      premium: "Premium",
      premiumActive: "Premium active",
      openMenu: "Open menu",
      closeMenu: "Close menu",
      navLabel: "Navigation menu",
    },
    home: {
      subtitle: "Free tool for safer decisions in DeFi.",
      description:
        "Average price calculator, liquidity pool analysis and health monitoring for Aave protocols — all in one place so you can make informed decisions.",
      featuresTitle: "Features",
      access: "Access",
      featureDashboardTitle: "Dashboard",
      featureDashboardDescription:
        "Overview of the DeFi ecosystem: total TVL, chains, protocols and real-time prices.",
      featureAveragePriceTitle: "Average Price",
      featureAveragePriceDescription:
        "Average price calculator for your cryptocurrency positions.",
      featurePoolsTitle: "Liquidity Pools",
      featurePoolsDescription:
        "Your LP positions and pool list by network (Ethereum, BNB, Polygon, Arbitrum).",
      featureDefiHealthTitle: "DeFi Health (Aave)",
      featureDefiHealthDescription:
        "Health factor, collateral, debt and liquidation price on Aave V3.",
      cta: "Connect your wallet in the header and explore the dashboard, pools and Aave health.",
    },
    authLogin: {
      errorCreate: "Error creating account.",
      errorLogin: "Error signing in.",
      tokenPreparing: "Account created. Your token is being prepared…",
      tokenTitle: "Your recovery token (save it in case you forget your password):",
      tokenHelp:
        'Use this token in the "Forgot password" option to reset your password. It will not be shown again.',
      tokenCapacityWarning:
        "Maximum capacity of 100 users reached. New signups may be blocked.",
      copyToken: "Copy token",
      tokenSoon:
        "In a moment the token will appear here. Keep it in a safe place.",
      goToApp: "Go to the app",
      usernameLabel: "Username",
      usernamePlaceholderCreate: "How do you want to be called",
      passwordLabel: "Password",
      passwordPlaceholder: "Minimum 6 characters",
      back: "Back",
      creating: "Creating...",
      create: "Create account",
      usernamePlaceholderLogin: "Your username",
      passwordPlaceholderLogin: "Your password",
      entering: "Signing in...",
      enter: "Sign in",
      createOption: "Create account (name and password)",
      alreadyHaveAccount: "I already have an account — sign in",
      forgotPassword: "I forgot my password",
    },
    authSignup: {
      errorCreate: "Error creating account.",
      usernameLabel: "Username",
      usernamePlaceholder: "Your username",
      passwordLabel: "Password",
      passwordPlaceholder: "Minimum 6 characters",
      creating: "Creating...",
      create: "Create account",
    },
    authForgot: {
      tokenInvalid: "Invalid token.",
      errorValidateToken: "Error validating token.",
      errorResetPassword: "Error resetting password.",
      successMessage: "Password changed successfully. Sign in with your new password.",
      goToLogin: "Go to sign in",
      newPasswordLabel: "New password",
      newPasswordPlaceholder: "Minimum 6 characters",
      back: "Back",
      saving: "Saving...",
      setNewPassword: "Set new password",
      introText:
        "Enter the recovery token you received when creating the account. Then you will be able to set a new password.",
      tokenLabel: "Recovery token",
      tokenPlaceholder: "Paste your token here",
      validateLoading: "Validating...",
      continue: "Continue",
    },
    footer: {
      builtBy:
        "Built by someone who has also been liquidated.",
      donateWithHandler: "consider supporting the project",
      donateWithoutHandler: "consider supporting the project.",
      intro:
        "Safy is free. If it helped you avoid losses, ",
    },
    donation: {
      title: "Support Safy",
      closeAria: "Close",
      chooseHow: "Choose how you want to contribute:",
      lightningLabel: "Lightning (BTC)",
      lightningDescription: "Lightning Network — instant and low fees",
      btcLabel: "Bitcoin (on-chain)",
      btcDescription: "Native BTC address",
      evmLabel: "EVM (ETH, MATIC, etc.)",
      evmDescription: "Ethereum, Polygon and other compatible networks",
      copied: "Copied!",
      copy: "Copy",
    },
    premium: {
      addNetworkError:
        "Add the network in your wallet and try again.",
      switchNetworkError:
        "Switch the network in your wallet and try again.",
      paymentDataError:
        "Payment data unavailable. Reload the page.",
      noWalletError:
        "No wallet found. Install MetaMask or another compatible wallet.",
      txNotSentError: "Transaction not sent. Try again.",
      txSentWaiting:
        "Transaction sent. Waiting for confirmation on {network}…",
      paymentConfirmedUntil: "Payment confirmed. Premium active until {date}.",
      paymentConfirmed: "Payment confirmed. Premium activated.",
      confirmationSlow:
        "Confirmation is taking a while. Premium will be activated soon.",
      txSendError: "Error sending transaction.",
      txRejected: "Transaction rejected in wallet.",
      openWalletError:
        "Error opening the wallet. Try again.",
      heading: "SafyApp Premium",
      premiumActiveBadge: "Premium plan active",
      premiumThanks: "Thanks for supporting SafyApp.",
      premiumValidUntil: "Your plan is valid until ",
      telegramCta: "Receive bot alerts on Telegram",
      loginAndConnectWallet:
        "To activate premium, sign in and connect the wallet you will use to pay.",
      connect: "Connect",
      connectWalletToPay:
        "Connect your wallet to pay and activate premium.",
      whichPlan: "Which plan do you want?",
      monthly: "Monthly · US$ 2",
      annual: "Annual · US$ 18 (US$ 1.50/month)",
      whichNetwork: "On which network do you want to pay?",
      walletWillOpen:
        "The wallet will open on the {network} network with {amount} filled in.",
      openWalletAndPay:
        "Open wallet and pay {amount} ({network})",
      infoLoggedAndConnected:
        "You need to be logged in and connect your wallet. After confirming the payment in the wallet, premium is activated automatically.",
      connectWalletButton: "Connect wallet",
      connecting: "Connecting…",
      login: "Sign in",
      heroBadge: "Premium plan • US$ 2/month or US$ 18/year",
      heroTitle: "Smart alerts to protect your DeFi wallet.",
      heroDescription:
        "For just US$ 2/month you receive Telegram alerts about Aave health, liquidation risk and a daily report summarizing your position. Or pay US$ 18/year (equivalent to US$ 1.50 per month).",
      freePlanTitle: "Free plan",
      freePlanItem1: "- Access to the basic dashboard",
      freePlanItem2: "- Manual check of pools and Aave health",
      freePlanItem3: "- No automatic alerts",
      paidPlanTitle: "Premium SafyApp · US$ 2/month or US$ 18/year",
      paidPlanItem1: "✓ Aave health alerts on Telegram",
      paidPlanItem2: "✓ Liquidation risk warnings",
      paidPlanItem3: "✓ Automatic daily report",
      paidPlanItem4: "✓ Priority support for new features",
      heroFooter:
        "You can cancel at any time. The amount is charged in stablecoin (USDT) on low-cost networks.",
    },
    wallet: {
      errorNoAddress:
        "Connect your wallet at the top of the screen to see tokens.",
      title: "Wallet",
      description:
        "Quickly see the main tokens in your wallet on supported networks (native, USDT and USDC on BNB Chain, Polygon and Arbitrum).",
      updateBalances: "Update balances",
      updatingBalances: "Updating balances…",
      connectWallet: "Connect wallet",
      connectingWallet: "Connecting wallet…",
      connectInfo:
        "Connect your wallet at the top of the screen to automatically list supported tokens.",
      clickUpdate:
        'Click on "Update balances" to fetch the tokens in your wallet.',
      noBalances:
        "No balance found on supported networks (BNB Chain, Polygon, Arbitrum) for native tokens, USDT or USDC.",
      fetchErrorDefault: "Error fetching wallet tokens.",
      loadingMessage: "Loading...",
    },
    averagePricePage: {
      title: "Average Price",
      subtitle: "Track your cryptocurrencies with charts and average price.",
      exportCsv: "Export CSV",
      exportExcel: "Export Excel",
      addPurchase: "Add purchase",
      addPurchaseTooltip: "Log in to add purchases.",
      cryptoLabel: "Cryptocurrency",
      errorBox: "Error",
      totalInvestedByCoin: "Total invested by coin",
      entriesTitle: "Entries ({currency})",
      clearThisCoin: "Clear this coin",
      estimatedPl: "Estimated P/L",
      totalInvestedUsd: "Total invested (USD)",
      averagePrice: "Average price",
      currentPriceLabel: "Current price (for estimated P/L)",
      addPurchaseCta:
        'Click "Add purchase" to record your trades and see charts and average price.',
      modalTitle: "Add purchase",
      modalCrypto: "Cryptocurrency",
      modalUnitPrice: "Unit price (USD)",
      modalDate: "Date",
      modalQuantity: "Amount of {currency}",
      modalTotalUsd: "Total value (USD)",
      modalClose: "Close",
      modalSaving: "Saving…",
      modalAdd: "Add",
      removeEntryAria: "Remove",
      chartAverageEvolution: "Average price evolution ({currency})",
      chartLabelPrice: "Average price",
      chartLabelDate: "Date: {date}",
    },
    pools: {
      headerTitle: "Liquidity Pools",
      headerDescription:
        "Connect your wallet in the header and click See my positions. We query Ethereum, BNB Chain, Polygon and Arbitrum via RPC; networks without positions show \"No position on this network\".",
      myPositions: "My positions",
      errorLoading: "Error loading pools.",
      viewAllNetworks: "See my positions on all networks",
      loadingAllNetworks: "Fetching on all networks…",
      connectHeader:
        "Connect your wallet in the header to see your positions.",
      noPositionThisNetwork: "No position on this network.",
      price: "Price",
      liquidity: "Liquidity",
      volume24h: "24h volume",
      apy: "APY",
      positionValue: "Position value",
      openInKrystal: "Open in Krystal",
      multiNetworkTitle: "Multiple networks (RPC + Dexscreener + DefiLlama)",
      multiNetworkDescription:
        'Positions are automatically queried on Ethereum, BNB Chain, Polygon and Arbitrum. Networks without positions show "No position on this network".',
    },
    defiHealthPage: {
      headerTitle: "DeFi Health — Aave",
      headerDescription:
        "Check your position on Aave V3 across all networks: health factor, collateral, debt and liquidation price. Connect your wallet in the header and click Check.",
      checkSectionTitle: "Check position",
      connectHeader:
        "Connect your wallet in the header to check your position on Aave.",
      rpcInfo:
        'Data is fetched via RPC on Ethereum, Polygon and Arbitrum. Networks without positions show "No position on this network".',
      errorDefault: "Error fetching data from Aave.",
      checkAllNetworks: "Check position on all networks",
      loadingAllNetworks: "Fetching on all networks…",
      noPositionThisNetwork: "No Aave position on this network.",
      linksTitle: "Links",
      openOnAave: "Open position on Aave",
      hfLabel: "Health Factor",
      totalCollateralLabel: "Total collateral",
      totalDebtLabel: "Total debt",
      ltvLabel: "LTV / LT",
      collateralsTitle: "Collaterals",
      debtsTitle: "Loans",
      tableAsset: "Asset",
      tableBalance: "Balance",
      tableValue: "Value",
      tableDebt: "Debt",
      tableRate: "Rate",
      noRows: "—",
      coupledMode: "Coupled",
      singleAssetMode: "Single-asset",
      liquidationPriceLabel: "Estimated liquidation value",
      dropUntilLiquidationLabel: "Drop until liquidation",
    },
    validationPage: {
      title: "Account under validation",
      description:
        "Your account has not been validated yet. Open the link we sent to your email to activate it and be able to sign in to the app.",
      hint:
        "If you have already confirmed your email, log out and sign in again with your email and password.",
      logout: "Log out",
      goToLogin: "Go to login",
    },
    telegram: {
      missingChatId:
        "chat_id missing in URL. Open the link directly from the conversation with the bot.",
      mustBeLogged:
        "You must be logged in to SafyApp to connect Telegram.",
      failedConnect:
        "Failed to connect Telegram. Try again.",
      success: "Telegram connected successfully.",
      networkError:
        "Network error when connecting Telegram. Try again in a moment.",
      title: "Connect Telegram",
      connecting:
        "Connecting your Telegram to your SafyApp account…",
      nothingToDo:
        "Nothing to do right now. Open the link directly from the bot in Telegram to connect your account.",
      hint:
        "Tip: if you are not logged into SafyApp yet, sign in in another tab and come back to this link.",
    },
    offline: {
      title: "You are offline",
      description: "Connect to the internet to keep using Safy App.",
      retry: "Try again",
    },
    dashboard: {
      loadError: "Failed to load dashboard data.",
      headerTitle: "DeFi Llama · market",
      headerDescription:
        "Public data from the DeFi ecosystem (not your wallet balances).",
      pricesTitle: "Prices of main coins",
      pricesSubtitle:
        "Real-time quotes (TradingView). Third-party data.",
      tvlTotalTitle: "Total Value Locked in DeFi",
      tvlTotalSubtitle: "Sum of TVL across all chains.",
      tvlByChainTitle: "TVL by chain",
      protocolRankingsTitle: "Protocol Rankings",
      noProtocols: "No protocols available at the moment.",
      tvlSourcePrefix: "TVL data via ",
      tvlSourceSuffix: " Updated periodically.",
      tradingviewTitle: "TradingView Ticker Tape — cryptocurrencies",
    },
  },
  "pt-BR": {
    common: {
      donateTitle: "Apoiar o projeto",
      donateShort: "☕",
      donateLong: "☕ Doar",
      disconnectShort: "Sair",
      disconnectLong: "Desconectar",
      connectTitle: "Conectar carteira",
      connect: "Conectar",
      login: "Entrar",
      langToggleTitle: "Mudar idioma",
      langShortEn: "EN",
      langShortPt: "PT",
      userMenuAria: "Menu do usuário",
      loggedInAs: "Logado como",
      userFallback: "Usuário",
    },
    nav: {
      dashboard: "DeFi",
      wallet: "Carteira",
      averagePrice: "Preço médio",
      pools: "Pools",
      defiHealth: "Saúde DeFi",
      premium: "Premium",
      premiumActive: "Premium ativo",
      openMenu: "Abrir menu",
      closeMenu: "Fechar menu",
      navLabel: "Menu de navegação",
    },
    home: {
      subtitle: "Ferramenta gratuita para decisões mais seguras em DeFi.",
      description:
        "Calculadora de preço médio, análise de pools de liquidez e monitoramento de saúde em protocolos Aave — tudo em um só lugar para você tomar decisões informadas.",
      featuresTitle: "Funcionalidades",
      access: "Acessar",
      featureDashboardTitle: "Dashboard",
      featureDashboardDescription:
        "Visão geral do ecossistema DeFi: TVL total, chains, protocolos e preços em tempo real.",
      featureAveragePriceTitle: "Preço Médio",
      featureAveragePriceDescription:
        "Calculadora de preço médio para suas posições em criptomoedas.",
      featurePoolsTitle: "Pools de Liquidez",
      featurePoolsDescription:
        "Suas posições LP e lista de pools por rede (Ethereum, BNB, Polygon, Arbitrum).",
      featureDefiHealthTitle: "Saúde DeFi (Aave)",
      featureDefiHealthDescription:
        "Health factor, colateral, dívida e preço de liquidação na Aave V3.",
      cta: "Conecte sua carteira no header e explore o dashboard, pools e saúde Aave.",
    },
    authLogin: {
      errorCreate: "Erro ao criar conta.",
      errorLogin: "Erro ao entrar.",
      tokenPreparing: "Conta criada. Seu token está sendo preparado…",
      tokenTitle:
        "Seu token de recuperação (guarde para caso esqueça a senha):",
      tokenHelp:
        'Use este token na opção "Esqueci senha" para redefinir sua senha. Ele não será exibido novamente.',
      tokenCapacityWarning:
        "Capacidade máxima de 100 usuários atingida. Novos cadastros poderão ser bloqueados.",
      copyToken: "Copiar token",
      tokenSoon:
        "Em instantes o token aparecerá aqui. Guarde-o em lugar seguro.",
      goToApp: "Ir para o app",
      usernameLabel: "Nome de usuário",
      usernamePlaceholderCreate: "Como quer ser chamado",
      passwordLabel: "Senha",
      passwordPlaceholder: "Mínimo 6 caracteres",
      back: "Voltar",
      creating: "Criando...",
      create: "Criar conta",
      usernamePlaceholderLogin: "Seu nome de usuário",
      passwordPlaceholderLogin: "Sua senha",
      entering: "Entrando...",
      enter: "Entrar",
      createOption: "Criar conta (nome e senha)",
      alreadyHaveAccount: "Já tenho conta — entrar",
      forgotPassword: "Esqueci minha senha",
    },
    authSignup: {
      errorCreate: "Erro ao criar conta.",
      usernameLabel: "Nome de usuário",
      usernamePlaceholder: "Seu nome de usuário",
      passwordLabel: "Senha",
      passwordPlaceholder: "Mínimo 6 caracteres",
      creating: "Criando...",
      create: "Criar conta",
    },
    authForgot: {
      tokenInvalid: "Token inválido.",
      errorValidateToken: "Erro ao validar token.",
      errorResetPassword: "Erro ao redefinir senha.",
      successMessage: "Senha alterada com sucesso. Entre com sua nova senha.",
      goToLogin: "Ir para entrar",
      newPasswordLabel: "Nova senha",
      newPasswordPlaceholder: "Mínimo 6 caracteres",
      back: "Voltar",
      saving: "Salvando...",
      setNewPassword: "Definir nova senha",
      introText:
        "Informe o token de recuperação que você recebeu ao criar a conta. Em seguida você poderá definir uma nova senha.",
      tokenLabel: "Token de recuperação",
      tokenPlaceholder: "Cole seu token aqui",
      validateLoading: "Validando...",
      continue: "Continuar",
    },
    footer: {
      builtBy: "Construído por quem também já foi liquidado.",
      donateWithHandler: "considere apoiar o projeto",
      donateWithoutHandler: "considere apoiar o projeto.",
      intro:
        "Safy é gratuito. Se isso te ajudou a evitar perdas, ",
    },
    donation: {
      title: "Apoiar o Safy",
      closeAria: "Fechar",
      chooseHow: "Escolha como deseja contribuir:",
      lightningLabel: "Lightning (BTC)",
      lightningDescription: "Rede Lightning — instantâneo e com taxas baixas",
      btcLabel: "Bitcoin (on-chain)",
      btcDescription: "Endereço BTC nativo",
      evmLabel: "EVM (ETH, MATIC, etc.)",
      evmDescription: "Ethereum, Polygon e outras redes compatíveis",
      copied: "Copiado!",
      copy: "Copiar",
    },
    premium: {
      addNetworkError:
        "Adicione a rede na sua carteira e tente novamente.",
      switchNetworkError:
        "Altere a rede na sua carteira e tente novamente.",
      paymentDataError:
        "Dados de pagamento indisponíveis. Recarregue a página.",
      noWalletError:
        "Nenhuma carteira encontrada. Instale MetaMask ou outra wallet compatível.",
      txNotSentError: "Transação não enviada. Tente novamente.",
      txSentWaiting:
        "Transação enviada. Aguardando confirmação na {network}…",
      paymentConfirmedUntil:
        "Pagamento confirmado. Premium ativo até {date}.",
      paymentConfirmed: "Pagamento confirmado. Premium ativado.",
      confirmationSlow:
        "Confirmação está demorando. O premium será ativado em breve.",
      txSendError: "Erro ao enviar transação.",
      txRejected: "Transação recusada na carteira.",
      openWalletError:
        "Erro ao abrir a carteira. Tente novamente.",
      heading: "Premium SafyApp",
      premiumActiveBadge: "Plano premium ativo",
      premiumThanks: "Obrigado por apoiar o SafyApp.",
      premiumValidUntil: "Seu plano está válido até ",
      telegramCta: "Receber alertas do bot no Telegram",
      loginAndConnectWallet:
        "Para ativar o premium, faça login e conecte a carteira que usará para pagar.",
      connect: "Conectar",
      connectWalletToPay:
        "Conecte sua carteira para pagar e ativar o premium.",
      whichPlan: "Qual plano você deseja?",
      monthly: "Mensal · US$ 2",
      annual: "Anual · US$ 18 (US$ 1,50/mês)",
      whichNetwork: "Em qual rede deseja pagar?",
      walletWillOpen:
        "A carteira será aberta na rede {network} com {amount} preenchidos.",
      openWalletAndPay:
        "Abrir carteira e pagar {amount} ({network})",
      infoLoggedAndConnected:
        "É necessário estar logado e conectar a carteira. Ao confirmar o pagamento na carteira, o premium é ativado automaticamente.",
      connectWalletButton: "Conectar carteira",
      connecting: "Conectando…",
      login: "Entrar",
      heroBadge: "Plano premium • US$ 2/mês ou US$ 18/ano",
      heroTitle: "Alertas inteligentes para proteger sua carteira DeFi.",
      heroDescription:
        "Por apenas US$ 2/mês você recebe alertas no Telegram sobre saúde da Aave, risco de liquidação e um relatório diário resumindo sua posição. Se preferir, pague US$ 18/ano (equivalente a US$ 1,50 por mês).",
      freePlanTitle: "Plano gratuito",
      freePlanItem1: "- Acesso ao painel básico",
      freePlanItem2: "- Consulta manual de pools e saúde da Aave",
      freePlanItem3: "- Sem alertas automáticos",
      paidPlanTitle: "Premium SafyApp · US$ 2/mês ou US$ 18/ano",
      paidPlanItem1: "✓ Alertas de saúde da Aave no Telegram",
      paidPlanItem2: "✓ Avisos de risco de liquidação",
      paidPlanItem3: "✓ Relatório diário automático",
      paidPlanItem4: "✓ Suporte prioritário para novidades",
      heroFooter:
        "Você pode cancelar a qualquer momento. O valor é cobrado em stablecoin (USDT) em redes de baixo custo.",
    },
    wallet: {
      errorNoAddress:
        "Conecte a carteira no topo da tela para ver os tokens.",
      title: "Carteira",
      description:
        "Veja rapidamente os principais tokens da sua carteira nas redes suportadas (nativo, USDT e USDC em BNB Chain, Polygon e Arbitrum).",
      updateBalances: "Atualizar saldos",
      updatingBalances: "Atualizando saldos…",
      connectWallet: "Conectar carteira",
      connectingWallet: "Conectando carteira…",
      connectInfo:
        "Conecte sua carteira no topo da tela para listar automaticamente os tokens suportados.",
      clickUpdate:
        'Clique em "Atualizar saldos" para consultar os tokens presentes na sua carteira.',
      noBalances:
        "Nenhum saldo encontrado nas redes suportadas (BNB Chain, Polygon, Arbitrum) para os tokens nativos, USDT ou USDC.",
      fetchErrorDefault: "Erro ao buscar tokens da carteira.",
      loadingMessage: "Carregando...",
    },
    averagePricePage: {
      title: "Preço Médio",
      subtitle: "Acompanhe suas criptomoedas com gráficos e preço médio.",
      exportCsv: "Exportar CSV",
      exportExcel: "Exportar Excel",
      addPurchase: "Adicionar compra",
      addPurchaseTooltip: "Faça login para adicionar compras.",
      cryptoLabel: "Criptomoeda",
      errorBox: "Erro",
      totalInvestedByCoin: "Total investido por moeda",
      entriesTitle: "Entradas ({currency})",
      clearThisCoin: "Limpar desta moeda",
      estimatedPl: "P/L estimado",
      totalInvestedUsd: "Total investido (USD)",
      averagePrice: "Preço médio",
      currentPriceLabel: "Preço atual (para P/L estimado)",
      addPurchaseCta:
        'Clique em "Adicionar compra" para registrar suas compras e ver gráficos e preço médio.',
      modalTitle: "Adicionar compra",
      modalCrypto: "Criptomoeda",
      modalUnitPrice: "Preço unitário (USD)",
      modalDate: "Data",
      modalQuantity: "Quantidade de {currency}",
      modalTotalUsd: "Valor total (USD)",
      modalClose: "Fechar",
      modalSaving: "Salvando…",
      modalAdd: "Adicionar",
      removeEntryAria: "Remover",
      chartAverageEvolution: "Evolução do preço médio ({currency})",
      chartLabelPrice: "Preço médio",
      chartLabelDate: "Data: {date}",
    },
    pools: {
      headerTitle: "Pools de Liquidez",
      headerDescription:
        "Conecte a carteira no header e clique em Ver minhas posições. Consultamos Ethereum, BNB Chain, Polygon e Arbitrum via RPC; redes sem posição exibem \"Nenhuma posição nesta rede\".",
      myPositions: "Minhas posições",
      errorLoading: "Erro ao carregar pools.",
      viewAllNetworks: "Ver minhas posições em todas as redes",
      loadingAllNetworks: "Buscando em todas as redes…",
      connectHeader:
        "Conecte a carteira no header para ver suas posições.",
      noPositionThisNetwork: "Nenhuma posição nesta rede.",
      price: "Preço",
      liquidity: "Liquidez",
      volume24h: "Volume 24h",
      apy: "APY",
      positionValue: "Valor da posição",
      openInKrystal: "Abrir na Krystal",
      multiNetworkTitle: "Múltiplas redes (RPC + Dexscreener + DefiLlama)",
      multiNetworkDescription:
        'As posições são consultadas automaticamente em Ethereum, BNB Chain, Polygon e Arbitrum. Redes sem posição mostram "Nenhuma posição nesta rede".',
    },
    defiHealthPage: {
      headerTitle: "Saúde DeFi — Aave",
      headerDescription:
        "Verifique sua posição na Aave V3 em todas as redes: health factor, colateral, dívida e preço de liquidação. Conecte a carteira no header e clique em Verificar.",
      checkSectionTitle: "Verificar posição",
      connectHeader:
        "Conecte a carteira no header para verificar sua posição na Aave.",
      rpcInfo:
        'Os dados são buscados via RPC em Ethereum, Polygon e Arbitrum. Redes sem posição exibem "Nenhuma posição nesta rede".',
      errorDefault: "Erro ao buscar dados na Aave.",
      checkAllNetworks: "Verificar posição em todas as redes",
      loadingAllNetworks: "Buscando em todas as redes…",
      noPositionThisNetwork: "Nenhuma posição na Aave nesta rede.",
      linksTitle: "Links",
      openOnAave: "Abrir posição na Aave",
      hfLabel: "Health Factor",
      totalCollateralLabel: "Total colateral",
      totalDebtLabel: "Total dívida",
      ltvLabel: "LTV / LT",
      collateralsTitle: "Colaterais",
      debtsTitle: "Empréstimos",
      tableAsset: "Ativo",
      tableBalance: "Saldo",
      tableValue: "Valor",
      tableDebt: "Dívida",
      tableRate: "Taxa",
      noRows: "—",
      coupledMode: "Coupled",
      singleAssetMode: "Single-asset",
      liquidationPriceLabel: "Preço de liquidação (estimado)",
      dropUntilLiquidationLabel: "Queda até liquidação",
    },
    validationPage: {
      title: "Conta em validação",
      description:
        "Sua conta ainda não foi validada. Acesse o link que enviamos para o seu email para ativar e poder entrar no app.",
      hint:
        "Se já confirmou o email, faça logout e entre novamente com seu email e senha.",
      logout: "Sair",
      goToLogin: "Ir para o login",
    },
    telegram: {
      missingChatId:
        "chat_id ausente na URL. Abra o link diretamente a partir da conversa com o bot.",
      mustBeLogged:
        "Você precisa estar logado na SafyApp para conectar o Telegram.",
      failedConnect:
        "Falha ao conectar Telegram. Tente novamente.",
      success: "Telegram conectado com sucesso.",
      networkError:
        "Erro de rede ao conectar Telegram. Tente novamente em instantes.",
      title: "Conectar Telegram",
      connecting:
        "Conectando seu Telegram à sua conta SafyApp…",
      nothingToDo:
        "Nada para fazer no momento. Acesse o link diretamente do bot no Telegram para conectar sua conta.",
      hint:
        "Dica: se você ainda não estiver logado na SafyApp, faça login em outra aba e volte para este link.",
    },
    offline: {
      title: "Você está offline",
      description:
        "Conecte-se à internet para continuar usando o Safy App.",
      retry: "Tentar novamente",
    },
    dashboard: {
      loadError: "Falha ao carregar dados do dashboard.",
      headerTitle: "DeFi Llama · mercado",
      headerDescription:
        "Dados públicos do ecossistema DeFi (não são saldos da sua carteira).",
      pricesTitle: "Preços das principais moedas",
      pricesSubtitle:
        "Cotações em tempo real (TradingView). Dados de terceiros.",
      tvlTotalTitle: "Total Value Locked in DeFi",
      tvlTotalSubtitle: "Soma do TVL em todas as chains.",
      tvlByChainTitle: "TVL por chain",
      protocolRankingsTitle: "Protocol Rankings",
      noProtocols: "Nenhum protocolo disponível no momento.",
      tvlSourcePrefix: "Dados de TVL via ",
      tvlSourceSuffix: " Atualizados periodicamente.",
      tradingviewTitle: "TradingView Ticker Tape — criptomoedas",
    },
  },
};

export function getTranslation(
  translationsForLocale: TranslationTree,
  path: string,
): string | undefined {
  const parts = path.split(".");
  let current: string | TranslationTree | undefined = translationsForLocale;
  for (const part of parts) {
    if (
      typeof current === "object" &&
      current !== null &&
      Object.prototype.hasOwnProperty.call(current, part)
    ) {
      current = (current as TranslationTree)[part];
    } else {
      return undefined;
    }
  }
  return typeof current === "string" ? current : undefined;
}

