# Stop/In
# Das ist kein Bot für einen Dauerlauf, sondern nur für eine gewisse Zeit
# Features
# -Einstoppen bei erreichen eines bestimmten Kurs Werts
# -Einstoppen bei einem bestimmten Wachstums in %
# -Stop bei erreichen eines bestimmten Werts
# -Stop bei einem prozentualen Sinken des Kurses

trading = require "trading"  
params = require "params"  
 

_maximumExchangeFee = .26
_orderTimeout = 30   
MINIMUM_AMOUNT = 30
#######Params
_einsatz = 1  #maximaler Einsatz prozentual vom Gesamtvermögen
_trailingStop = params.add "Trailing Stop in %", 5  #%  bei so einem Rückgang steige ich aus
_trailingIn = params.add "Trailing In in %", 0
_kursStop = params.add "Kurs Stop", 0
_kursIn = params.add "Kurs In", 0
outputCounter = 15
#######
init: ->  
    #This runs once when the bot is started  
    context.PERCENT = _trailingStop/100
    context.COUNTER = outputCounter
handle: ->  
    #This runs once every tick or bar on the graph  
    storage.botStartedAt ?= data.at  
    instrument = data.instruments[0]  

    assetsAvailable = @portfolios[instrument.market].positions[instrument.asset()].amount  
    currencyAvailable = @portfolios[instrument.market].positions[instrument.curr()].amount  

    storage.startKursCalc ?= instrument.price
    _maximumMoneyPerTrade = currencyAvailable * _einsatz
    if (_maximumMoneyPerTrade>0)
        maximumBuyAmount = (_maximumMoneyPerTrade/instrument.price) * (1 - (_maximumExchangeFee*2/100))  
    
    maximumSellAmount = assetsAvailable  #verkaufe alles was da ist
    
        
    #---------------------------------------------------------------------------
    #-----------------------------------Strategie-------------------------------
    #---------------------------------------------------------------------------

    if ((assetsAvailable>0)&&(_trailingStop>0))
        debug context.COUNTER
        if (context.COUNTER == 0)
            info "Ausstieg bei: #{storage.startKursCalc*(1-context.PERCENT)}"
            context.COUNTER = outputCounter
        context.COUNTER = context.COUNTER - 1
    #Einstieg bei einem festen Kurs
    if ((_kursIn>0)&&(assetsAvailable==0)&&(maximumBuyAmount >= MINIMUM_AMOUNT)&&(instrument.close[instrument.close.length-1]>_kursIn))  
        trading.buy instrument, 'market', maximumBuyAmount, instrument.price, _orderTimeout 
        storage.startKursCalc = instrument.price
    #Einstieg bei einem festen Prozentsatz über Minimum, d.h. wenn der Kurs wieder steigt
    if ((_trailingIn>0)&&(assetsAvailable==0)&&(maximumBuyAmount >= MINIMUM_AMOUNT)&&(instrument.close[instrument.close.length-1]>storage.startKursCalc*(1+context.PERCENT)))  
        trading.buy instrument, 'market', maximumBuyAmount, instrument.price, _orderTimeout 
        storage.startKursCalc = instrument.price
    #passe den Referenzkurs an den steigenden Kurs an für Trailing Stop
    if ((assetsAvailable>0)&&(instrument.close[instrument.close.length-1]>storage.startKursCalc))
        storage.startKursCalc = instrument.price
    #Ausstieg bei festem Prozentsatz unter max. Kurs Wert
    if ((_trailingStop > 0)&&(assetsAvailable>0)&&(maximumSellAmount >= MINIMUM_AMOUNT)&&(instrument.close[instrument.close.length-1]<storage.startKursCalc*(1-context.PERCENT)))  
        trading.sell instrument, 'market', maximumSellAmount, instrument.price, _orderTimeout 
        storage.startKursCalc = instrument.price 
    #Ausstieg bei festem Kurs (StopLoss)
    if ((_kursStop > 0)&&(assetsAvailable>0)&&(maximumSellAmount >= MINIMUM_AMOUNT)&&(instrument.close[instrument.close.length-1]<_kursStop))  
        trading.sell instrument, 'market', maximumSellAmount, instrument.price, _orderTimeout 
        storage.startKursCalc = instrument.price 
    #passe den Referenzkurs an den fallenden Kurs an für Wiedereinstieg
    if ((assetsAvailable == 0)&&(instrument.close[instrument.close.length-1]<storage.startKursCalc))
        storage.startKursCalc = instrument.price 

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
