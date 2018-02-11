# Trailing Stop Ripple
# todo:


trading = require "trading"  
params = require "params"  
 

_maximumExchangeFee = .26
_orderTimeout = 30   
MINIMUM_AMOUNT = 0.001
#######Params
_einsatz = 1  #maximaler Einsatz prozentual vom Gesamtvermögen
_trailingStop = params.add "Trailing Stop in %", 10  #%  bei so einem Rückgang steige ich aus
#######
init: ->  
    #This runs once when the bot is started  
    context.PERCENT = _trailingStop/100
    context.NumberOfTrades = 0
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

    if ((assetsAvailable==0)&&(maximumBuyAmount >= MINIMUM_AMOUNT)&&(instrument.close[instrument.close.length-1]>storage.sellKurs))  
        trading.buy instrument, 'market', maximumBuyAmount, instrument.price, _orderTimeout 
        storage.startKursCalc = instrument.price
        context.NumberOfTrades = context.NumberOfTrades + 1 
    if ((assetsAvailable>0)&&(instrument.close[instrument.close.length-1]>storage.startKursCalc))
        storage.startKursCalc = instrument.price    
    if ((assetsAvailable>0)&&(maximumSellAmount >= MINIMUM_AMOUNT)&&(instrument.close[instrument.close.length-1]<storage.startKursCalc*(1-context.PERCENT)))  
        trading.sell instrument, 'market', maximumSellAmount, instrument.price, _orderTimeout 
        storage.sellKurs = instrument.price
        context.NumberOfTrades = context.NumberOfTrades + 1 
    if ((assetsAvailable == 0)&&(instrument.close[instrument.close.length-1]<storage.startKursCalc))
        storage.startKursCalc = instrument.price 
    
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
    info "Number Of Trades = #{context.NumberOfTrades}"
    info "Hodl Profit = #{buhProfit.toFixed(2)}%"
    info "Bot Profit = #{botProfit.toFixed(2)}%" 
    debug ""
