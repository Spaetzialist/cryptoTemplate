# Trailing Stop Ripple
# todo:


trading = require "trading"  
params = require "params"  
 

_maximumExchangeFee = .26
_orderTimeout = 3
MINIMUM_AMOUNT = 0.001
#######Params
_einsatz = 1  #maximaler Einsatz prozentual vom Gesamtvermögen
periods = 8 # wie viele Perioden angeschaut werden für min/max
#######




init: ->  
    #This runs once when the bot is started  
    setPlotOptions
        performance:
            color: 'blue'
            secondary: true
            size: 5
    context.NumberOfTrades = 0
    context.buyPrice = 0
    context.maxBeforeBuyPrice = 0
handle: ->  
    #This runs once every tick or bar on the graph  
    storage.botStartedAt ?= data.at  
    instrument = data.instruments[0]  

    assetsAvailable = @portfolios[instrument.market].positions[instrument.asset()].amount  
    currencyAvailable = @portfolios[instrument.market].positions[instrument.curr()].amount  

    storage.startBalance ?= currencyAvailable + assetsAvailable * instrument.price     #speicher Startkapital für Auswertung am Ende
    storage.startPrice ?= instrument.price        #speicher initial price für Auswertung am Ende

    storage.startKursCalc ?= instrument.price
    storage.sellKurs ?= instrument.price
    _maximumMoneyPerTrade = currencyAvailable * _einsatz
    if (_maximumMoneyPerTrade>0)
        maximumBuyAmount = (_maximumMoneyPerTrade/instrument.price) * (1 - (_maximumExchangeFee*2/100))  
    maximumSellAmount = assetsAvailable  #verkaufe alles was da ist
    
    plot
        performance: 100*(currencyAvailable + assetsAvailable * instrument.price)/storage.startBalance

    #---------------------------------------------------------------------------
    #-----------------------------------Strategie-------------------------------
    #---------------------------------------------------------------------------
    max = 0
    i = 2
    while i<periods+2
        if (instrument.high[instrument.high.length-i]>max)
            max = instrument.high[instrument.high.length-i]
        i = i + 1
    debug "max = #{max}"
    debug "assets = #{assetsAvailable}"
    if (assetsAvailable == 0)
        context.maxBeforeBuyPrice = max
    
    min = 1000000000
    i = 2
    while i<periods+2 
        if (instrument.low[instrument.low.length-i]<min)
            min = instrument.low[instrument.low.length-i]
        i = i + 1
    #debug "min = #{min}"
    
    
    if ((instrument.close[instrument.close.length-1]>max)&&(assetsAvailable==0))
        trading.buy instrument, 'market', maximumBuyAmount, instrument.price, _orderTimeout
        context.NumberOfTrades = context.NumberOfTrades + 1
        context.buyPrice = instrument.price
    #    debug "buyPrice = #{context.buyPrice}"
    #if(assetsAvailable > 0)
    #    info context.buyPrice
    #    debug instrument.close[instrument.close.length-1]
    #    debug instrument.close[instrument.close.length-1]/context.buyPrice
    debug "-----"
    debug "close: #{instrument.close[instrument.close.length-1]}"
    debug "buyPrice: #{context.buyPrice}"
    debug "maxBeforeBuyPrice: #{context.maxBeforeBuyPrice}"
    if (((instrument.close[instrument.close.length-1]<context.maxBeforeBuyPrice)||(instrument.close[instrument.close.length-1]>context.buyPrice*1.015))&&(assetsAvailable>0))
        trading.sell instrument, 'market', maximumSellAmount, instrument.price, _orderTimeout
    
    
onRestart: ->  
    debug "Bot restarted at #{new Date(data.at)}"  
    context.interator = 0

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
    info "Number Of Trades = #{context.NumberOfTrades}"
    info "Hodl Profit = #{buhProfit.toFixed(2)}%"
    info "Bot Profit = #{botProfit.toFixed(2)}%" 
    debug ""
