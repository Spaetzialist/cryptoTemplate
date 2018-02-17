# mit Ausgabe von Gewinn/Verlust in % 
# todo:


trading = require "trading"  
params = require "params"  
 

_maximumExchangeFee = .25  
_orderTimeout = 30   
MINIMUM_AMOUNT = 0.04

init: ->  
    #This runs once when the bot is started  
	context.candleHighPercentage = 50
	context.candleLowPercentage = 100
	setPlotOptions
        performance:
            color: 'blue'
            secondary: true
            size: 5
handle: ->  
    #This runs once every tick or bar on the graph  
    storage.botStartedAt ?= data.at  
    instrument = data.instruments[0]  

    assetsAvailable = @portfolios[instrument.market].positions[instrument.asset()].amount  
    currencyAvailable = @portfolios[instrument.market].positions[instrument.curr()].amount  
    storage.startBalance ?= currencyAvailable     #speicher Startkapital für Auswertung am Ende
    storage.startPrice ?= instrument.price        #speicher initial price für Auswertung am Ende
    storage.startKursCalc ?= instrument.price
    _maximumMoneyPerTrade = currencyAvailable * 1
    if (_maximumMoneyPerTrade>0)
        maximumBuyAmount = (_maximumMoneyPerTrade/instrument.price) * (1 - (_maximumExchangeFee/100))  
    else
        maximumBuyAmount = (currencyAvailable/instrument.price) * (1 - (_maximumExchangeFee/100))  
    maximumSellAmount = assetsAvailable  #verkaufe alles was da ist
    
        
    plot
        performance: 100*(currencyAvailable + assetsAvailable * instrument.price)/storage.startBalance
    #---------------------------------------------------------------------------
    #-----------------------------------Strategie-------------------------------
    #---------------------------------------------------------------------------
    candleBody = instrument.close[instrument.close.length-1] - instrument.open[instrument.open.length-1]
    debug "open|close: #{instrument.open[instrument.open.length-1]}|#{instrument.close[instrument.close.length-1]}"
    if (candleBody<0)
        candleBody = candleBody * (-1)
        candleHigh = instrument.high[instrument.high.length-1] - instrument.open[instrument.open.length-1]
        candleLow =   instrument.close[instrument.close.length-1] - instrument.low[instrument.low.length-1]
    else
        candleHigh = instrument.high[instrument.high.length-1] - instrument.close[instrument.open.length-1]
        candleLow = instrument.open[instrument.open.length-1] - instrument.low[instrument.low.length-1] 
    debug "candleBody: #{candleBody}"
    debug "candleHigh: #{candleHigh}"
    debug "candleLow: #{candleLow}"
    
    candleLowPercentage = candleLow/candleBody*100
    candleHighPercentage = candleHigh/candleBody*100
        
    if (assetsAvailable>0)
        trading.sell instrument
    if ((context.candleLowPercentage<candleLowPercentage)&&(assetsAvailable==0)&&(maximumBuyAmount >= MINIMUM_AMOUNT))
        trading.buy instrument, 'market', maximumBuyAmount, instrument.price, _orderTimeout 

onRestart: ->  
    debug "Bot restarted at #{new Date(data.at)}"  

onStop: ->  
    instrument = data.instruments[0] 
    debug "Bot started at #{new Date(storage.botStartedAt)}"  
    debug "Bot stopped at #{new Date(data.at)}"  

    assetsAvailable = @portfolios[instrument.market].positions[instrument.asset()].amount   
    if (assetsAvailable > 0)
        trading.sell instrument    #verkaufe alles um einen Endpreis zu erhalten
    currentBalance = @portfolios[instrument.market].positions[instrument.base()].amount 
    botProfit = ((currentBalance / storage.startBalance)*100) 
    buhProfit = ((instrument.price / storage.startPrice)*100) 
    debug "currency = #{currentBalance.toFixed(2)}"
    debug "assets = #{@portfolios[instrument.market].positions[instrument.asset()].amount}"
    info "Bot Profit = #{botProfit.toFixed(2)}%" 
    info "Hodl Profit = #{buhProfit.toFixed(2)}%"
    debug ""
