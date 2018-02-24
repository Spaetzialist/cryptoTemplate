# Kaufe bei SMA(5) > SMA(51)
# Verkaufe bei 1,5% erreicht oder 90% des Ausgangskurses erreicht oder SMA(5) < SMA(51)


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
    context.timeIntervalShort = 5
    context.timeIntervalLong = 51
    context.Prozent = 1.5
    setPlotOptions
        valueSMAShort:
            color: 'deeppink'
            lineWidth: 1
        valueSMALong:
            color: 'greenk'
            lineWidth: 1
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

    valueSMAShort_ = talib.SMA
        startIdx: instrument.close.length-context.timeIntervalShort
        endIdx: instrument.close.length-1
        inReal: instrument.close
        optInTimePeriod: context.timeIntervalShort
    valueSMAShort = valueSMAShort_[valueSMAShort_.length-1]
    valueSMAShortPre = valueSMAShort_[valueSMAShort_.length-2]
    #debug "valueSMAShort = #{valueSMAShort}"
    #debug "valueSMAShortPre = #{valueSMAShortPre}"

    valueSMALong_ = talib.SMA
        startIdx: instrument.close.length-context.timeIntervalLong
        endIdx: instrument.close.length-1
        inReal: instrument.close
        optInTimePeriod: context.timeIntervalLong
    valueSMALong = valueSMALong_[valueSMALong_.length-1]
    valueSMALongPre = valueSMALong_[valueSMALong_.length-2]
    
    
    valueATR = talib.ATR
        high : instrument.high
        low : instrument.low
        close :instrument.close
        startIdx : instrument.close.length-context.timeIntervalShort
        endIdx : instrument.close.length-1
        optInTimePeriod : context.timeIntervalShort
    valueATR = valueATR[valueATR.length-1]
    
    valueATR_Prozent = 100*valueATR/instrument.price
    #debug "valueATR_Prozent = #{valueATR_Prozent}%"
    
    plot
        valueSMAShort:valueSMAShort
        valueSMALong:valueSMALong
        
    #BUY    
    debug "asseassetsAvailablets = #{assetsAvailable}"
    if ((valueSMAShort > valueSMALong)&&(valueSMALong>valueSMALongPre)&&(assetsAvailable==0))
        trading.buy instrument, 'market', maximumBuyAmount, instrument.price, _orderTimeout
        context.buyPrice = instrument.price
        #debug "buyPrice = #{context.buyPrice}"
    #SELL
    if((assetsAvailable > 0)&&((context.buyPrice*0.9>instrument.price)||(instrument.price/context.buyPrice>1.015)||(valueSMAShort<valueSMALong)))
        info context.buyPrice
        #debug instrument.close[instrument.close.length-1]
        #debug instrument.close[instrument.close.length-1]/context.buyPrice
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

