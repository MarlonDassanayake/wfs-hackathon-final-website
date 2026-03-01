# Aletheia - Pocket-Sized Hedge Fund, our submission for WFS Fintech Hackathon
By Marlon, Armaan, Ricky, Rudraj, Kathan

## Project Description.

Aletheia is a pocket-sized hedge fund and first-principles based investment advisor that bridges the
gap between institutional and retail investors by delivering both long and short theses on individual
stocks, giving ratings on whether a stock is executable as long or short by surfacing contrarian
headwinds alongside a justified recommendation. Her Social tab re-rates news by market sentiment,
while the portfolio engine lets investors visualise positions, test sizing strategies, and analyse
institutional-grade risk metrics including Sharpe, beta, alpha, and asymmetry. What truly sets Aletheia
apart is her Risk Insights Section - an inbuilt tool that diagnoses portfolio risk exposure while
delivering actionable hedging and diversification recommendations; essentially simplifying retail
investing.

## Extended Description (Problem Statement)

Retail investors operate in a day-to-day market dominated by institutional capital, advanced analytics,
high technology and structured risk management frameworks. While hedge funds combine
fundamental research, quantitative screening, sentiment analysis, and portfolio construction discipline.
The outcome? Retail investors are stranded, stuck in their own loop of faulty practice, repetitive
losses, poor risk management, lack of market knowledge, lesser understanding of news and overall
efficiency loss. The main problem lies on the side of the retail investors, this unfair advantage holds a
big gap within the trading industry and needs to be solved.

## Solution

We present to you - Aletheia. A pocket-sized Hedge-Fund. Aletheia brings hedge-fund level research
and recommendations to retail investors.

1. First, quantitative, strategic and calculated Long/Short (L/S) picks on each and every stock
listed. Aletheia includes a huge number of carefully chosen statistical metrics (including but
limited to; Earnings quality and revisions, Revenue and margin trends, Balance sheet strength,
Valuation excess, Price momentum and positioning, Narrative intensity vs. fundamentals)
taken from official sources like CapitalIQ/Yahoo finance/historical numbers, to calculate a
final rating (AAA/AA/A) and a number (XX/100) which reflects the potential of the selected
stock to be executed as a Long or a Short Trade, giving investors a perfectly calculated
investment metric.

2. Secondly, we make market news efficient and evaluative - not just noise. Aletheia collates all
prevailing market news (both stock specific and general) and additionally, reflects the impact
of the news on the stock price (negatively impacted, positively impacted or neutral).

3. Not only this, Aletheia also captures the prevailing market sentiment analysis by scanning the
ends of the internet, using Reddit and Twitter threads of investor discussions to create a
sentiment analysis - differentiating hype vs. numbers. Furthermore, the Portfolio Engine. This
feature, one-of-its-kind, allows users to choose the stocks within their portfolio and uses
quantitative metrics to calculate and reflect your portfolio's sector concentration, Sharpe
Value, Beta Value and Alpha Value, giving investors a calculated statistic of how risky their
current portfolio is.

4. Building on this, Aletheia will now act as your Hedge Fund. After carefully studying your
Beta Risk (portfolio risk), Aletheia provides calculated hedge investment recommendations to
reduce risk and loss (examples include - Sector diversification suggestions, Defensive ETF
exposure, Commodity allocations, V olatility or inverse instruments).

Aletheia makes sure your profile is not one-sided and risky, but diverse and safe. Aletheia will make
sure you are risk-aware and simultaneously also know how to hedge these risks. These one-of-a-kind
services make Aletheia your own personal hedge-fund.

## Impact

Aletheia provides an unequivocal edge to retail investors through its unique positioning as a
fundamental research and portfolio modelling tool. The integration of real-time market news from
reddit, X and news outlets bridges the gap against super fast terminals such as Bloomberg. While
Aletheia is not as fast as Bloomberg Terminal, having seamless access to both news outlets and L/S
recommendations can help retail investors build confidence and thus conviction during their investing
journey. Peter Lynch’s ‘whoever turns the most rocks wins’ outlook inspired this platform, as Aletheia
simplifies stock searching through her qualitative and metrics-based scoring. Given that Aletheia’s
investment philosophy is outsourced from Wyandanch Library as well as her privately built
philosophy featuring Grahamian and Buffetology styles of investing, retail clients are rest assured to
be posed with exceptional quality research, despite ultimately being an LLM.

## Challenges

The most detrimental challenge facing Aletheia is her ultimate position, despite being a highly
intelligent tool, as an AI thought engine. This alone means that investors should not solely base
investment decisions on her ideas and recommendations; individual research and justification must be
conducted before opening a position to ensure clear-cut confidence. However, while this is a key
issue, we have explicitly included that Aletheia is not offering investment advice in the disclaimer.
Moreover, the Social tab allows clients to quickly assess market sentiment - which in turn may help
them make independent decisions despite Aletheia’s recommendations. Aside from this, the main key
risk is if data is inaccurate, but this has been mitigated as we have included high-quality, low-latency
financial data APIs with fallback validation logic.

## Important note

This repository does not include any real API keys or secrets.
The version of the code in this GitHub repo contains a non-working dummy API key as a placeholder.
To run the project locally, replace this dummy API key in the env files with a valid API key (this is what we have done in our local version).

## Pre-requisites required to use our app:

1. Install dependencies

   ```bash
   npm install
   ```

2. Start the app

   ```bash
   npx expo start
   ```

In the output, you'll find options to open the app in a

- [development build](https://docs.expo.dev/develop/development-builds/introduction/)
- [Android emulator](https://docs.expo.dev/workflow/android-studio-emulator/)
- [iOS simulator](https://docs.expo.dev/workflow/ios-simulator/)
- [Expo Go](https://expo.dev/go), a limited sandbox for trying out app development with Expo

