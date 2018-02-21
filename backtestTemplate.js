# Kaufe bei ATR > 1.5% und SMA > 0
# Verkaufe bei 1,5% erreicht oder Ausgangskurs erreicht


trading = require "trading"  
talib = require "talib"
 

_maximumExchangeFee = .26
_orderTimeout = 30   
MINIMUM_AMOUNT = 30
#######Params

#######
class functions

#### TA-lib Indicatots 

init: ->  
    #This runs once when the bot is started  
    context.timeInterval = 5
    context.Prozent = 1.5
    setPlotOptions
        valueSMA:
            color: 'deeppink'
            lineWidth: 2
    context.buyPrice = 0
handle: ->  
    #This runs once every tick or bar on the graph  
    storage.botStartedAt ?= data.at  
    instrument = data.instruments[0]  

    assetsAvailable = @portfolios[instrument.market].positions[instrument.asset()].amount  
    currencyAvailable = @portfolios[instrument.market].positions[instrument.curr()].amount  

    storage.startKursCalc ?= instrument.price
    _maximumMoneyPerTrade = currencyAvailable
    maximumBuyAmount = (_maximumMoneyPerTrade/instrument.price) * (1 - (_maximumExchangeFee*2/100))  
    
    maximumSellAmount = assetsAvailable  #verkaufe alles was da ist
    
        
    #---------------------------------------------------------------------------
    #-----------------------------------Strategie-------------------------------
    #---------------------------------------------------------------------------

    valueSMA_ = talib.SMA
        startIdx: instrument.close.length-context.timeInterval
        endIdx: instrument.close.length-1
        inReal: instrument.close
        optInTimePeriod: context.timeInterval
    valueSMA = valueSMA_[valueSMA_.length-1]
    valueSMAPre = valueSMA_[valueSMA_.length-2]
    #debug "valueSMA = #{valueSMA}"
    #debug "valueSMAPre = #{valueSMAPre}"
    
    valueATR = talib.ATR
        high : instrument.high
        low : instrument.low
        close :instrument.close
        startIdx : instrument.close.length-context.timeInterval
        endIdx : instrument.close.length-1
        optInTimePeriod : context.timeInterval
    valueATR = valueATR[valueATR.length-1]
    
    valueATR_Prozent = 100*valueATR/instrument.price
    #debug "valueATR_Prozent = #{valueATR_Prozent}%"
    
    plot
        valueSMA:valueSMA
        
    
    if ((valueATR_Prozent>context.Prozent)&&(valueSMA > valueSMAPre)&&(assetsAvailable==0))
        trading.buy instrument, 'market', maximumBuyAmount, instrument.price, _orderTimeout
        context.buyPrice = instrument.price
        debug "buyPrice = #{context.buyPrice}"
    if(assetsAvailable > 0)
        info context.buyPrice
        debug instrument.close[instrument.close.length-1]
        debug instrument.close[instrument.close.length-1]/context.buyPrice
        if ((context.buyPrice > instrument.close[instrument.close.length-1])||(instrument.close[instrument.close.length-1]/context.buyPrice>1.015))
            trading.sell instrument, 'market', maximumSellAmount, instrument.price, _orderTimeout
        
onRestart: ->  
    debug "Bot restarted at #{new Date(data.at)}"  

onStop: ->  
    instrument = data.instruments[0] 
    debug "Bot started at #{new Date(storage.botStartedAt)}"  
    debug "Bot stopped at #{new Date(data.at)}"  

    assetsAvailable = @portfolios[instrument.market].positions[instrument.asset()].amount   
    currentBalance = @portfolios[instrument.market].positions[instrument.base()].amount 

    debug "currency = #{currentBalance.toFixed(2)}"
    debug "assets = #{@portfolios[instrument.market].positions[instrument.asset()].amount}"

    debug ""

