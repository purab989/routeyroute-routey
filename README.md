# Route Optimizer

Factory-to-Customer Shipping Route Efficiency Analysis for Nassau Candy Distributor

Detailed guide and project requirements for the Factory-to-Customer Shipping Route Efficiency Analysis for Nassau Candy Distributor analysis.

Background and Context:

Nassau Candy Distributor operates as a national distributor, shipping products from factories to customers across multiple US regions.
In such operations:

• Shipping efficiency directly affects customer satisfaction.

• Delays increase operational cost.

• Inefficient routes reduce scalability.

Despite having rich order and shipment data, logistics decisions are often made without route-level efficiency intelligence. Problem Statement

The organization currently lacks clarity on:

• Which factory-to-customer routes are consistently efficient

• Which routes experience frequent delays

• How shipping performance varies by region, state, and ship mode

• Where operational bottlenecks exist geographically

• Without this visibility, logistics optimization remains reactive rather than data-driven.

Dataset Fields Description:

FieldDescriptionRow IDUnique row identifierOrder IDUnique order identifierOrder DateDate of orderShip DateDate of shipmentShip ModeShipping method of orderCustomer IDUnique customer identifierCountry/RegionCountry or region of customerCityCity of customerState/ProvinceState/province of customerPostal CodePostal code / zip code of customerDivisionProduct divisionRegionRegion of customerProduct IDUnique product identifierProduct NameProduct long namerSalesTotal sales value of orderUnitsTotal units of orderGross ProfitGross profit of order ( Sales - Cost )CostCost to manufacture

Analytical Methodology (Step-by-Step)

Data Cleaning & Validation

• Validate date formats

• Remove invalid or negative lead times

• Handle missing shipment records

• Standardize geographic fields

Feature Engineering

• Calculate Shipping Lead Time (days)

• Categorize routes by:

○ Factory → Customer Region

○ Factory → Customer State

• Group shipments by Ship Mode

Route Definition & Aggregation

Each route is defined as: Factory Location → Customer State / Region For each route:

• Total shipments

• Average shipping lead time

• Lead time variability

Efficiency Benchmarking

• Rank routes from fastest to slowest

• Identify:

○ Top 10 most efficient routes

○ Bottom 10 least efficient routes

• Compare performance across ship modes

Geographic Bottleneck Analysis

• Identify regions with:

○ High average lead time

○ High shipment volume + poor performance

• Detect congestion-prone states or regions

Ship Mode Performance Analysis

• Compare shipping efficiency by:

○ Standard shipping

○ Expedited shipping

• Evaluate cost-time tradeoffs (descriptive)

Key Performance Indicators (KPIs)

KPIDescriptionShipping Lead TimeShip Date − Order DateAverage Lead TimeMean shipping duration per routeRoute VolumeNumber of orders per routeDelay Frequency% of shipments exceeding thresholdRoute Efficiency ScoreNormalized lead-time performance

Streamlit Web Application Requirements

Dashboard Modules

• Route Efficiency Overview

● Average lead time by route

● Route performance leaderboard

• Geographic Shipping Map

● US heatmap of shipping efficiency

● Regional bottleneck visualization

• Ship Mode Comparison

● Lead time comparison by shipping method

• Route Drill-Down

● State-level performance insights

● Order-level shipment timelines

User Capabilities

• Date range filter

• Region / State selector

• Ship mode filter

• Lead-time threshold slider

Deliverables and Submission

• Research paper (EDA, insights, recommendations)

• Streamlit dashboard (live analytics)

• Executive summary for government stakeholders

Conclusion

This project establishes a clear, data-driven understanding of shipping route efficiency for Nassau Candy Distributor. By transforming raw order and shipment data into route-level operational intelligence, the organization gains actionable insights to improve logistics performance, reduce delays, and enhance nationwide delivery reliability.

Factories Co-ordinates

FactoryLatitudeLongitudeLot's O' Nuts32.881893-111.768036Wicked Choccy's32.076176-81.088371Sugar Shack48.11914-96.18115Secret Factory41.446333-90.565487The Other Factory35.1175-89.971107

Products and Factories Correlation

DivisionProduct NameFactoryChocolateWonka Bar - Nutty Crunch SurpriseLot's O' NutsChocolateWonka Bar - Fudge MallowsLot's O' NutsChocolateWonka Bar -ScrumdiddlyumptiousLot's O' NutsChocolateWonka Bar - Milk ChocolateWicked Choccy'sChocolateWonka Bar - Triple Dazzle CaramelWicked Choccy'sSugarLaffy TaffySugar ShackSugarSweeTARTSSugar ShackSugarNerdsSugar ShackSugarFun DipSugar ShackOtherFizzy Lifting DrinksSugar ShackSugarEverlasting GobstopperSecret FactorySugarHair ToffeeThe Other FactoryOtherLickable WallpaperSecret FactoryOtherWonka GumSecret FactoryOtherKazooklesThe Other Factory

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://routeyroute-routey.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/d5f8d936-ae52-46ff-b534-bd8715b08b0b).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
