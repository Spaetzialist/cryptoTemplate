#mit Ausgabe von Gewinn/Verlust in % 

trading = require "trading"  
params = require "params"  
 

_maximumExchangeFee = params.add "Maximum exchange fee %", .25  
#_maximumOrderAmount = params.add "Maximum order amount", 1         #wieviel Stück maximal
_maximumMoneyPerTrade = params.add "Maximum money per trade", 25   #wieviel Geld pro Trade maximal, 0: so viel wie es geht
_rebuy = params.add "Buy more than once before selling?", 0         #muss man erst verkaufen um wieder neu zu kaufen oder kann man auch mehrmals hintereinander kaufen?
                                                                   #1: mehrmals, 0: nur 1x kaufen
_orderTimeout = params.add "Order timeout", 30  
MINIMUM_AMOUNT = .01  
  

init: ->  
    #This runs once when the bot is started  
handle: ->  
    #This runs once every tick or bar on the graph  
    storage.botStartedAt ?= data.at  
    instrument = data.instruments[0]  

    assetsAvailable = @portfolios[instrument.market].positions[instrument.asset()].amount  
    currencyAvailable = @portfolios[instrument.market].positions[instrument.curr()].amount  
    storage.startBalance ?= currencyAvailable     #speicher Startkapital für Auswertung am Ende
    storage.startPrice ?= instrument.price        #speicher initial price für Auswertung am Ende

    if (_maximumMoneyPerTrade>0)
        maximumBuyAmount = _maximumMoneyPerTrade * (1 - (_maximumExchangeFee/100))  
    else
        maximumBuyAmount = (currencyAvailable/instrument.price) * (1 - (_maximumExchangeFee/100))  
    maximumSellAmount = (assetsAvailable * (1 - (_maximumExchangeFee/100)))  #verkaufe alles was da ist
    
    
    #---------------------------------------------------------------------------
    #-----------------------------------Strategie-------------------------------
    #---------------------------------------------------------------------------
    if (_rebuy > 0)
        if ((maximumBuyAmount >= MINIMUM_AMOUNT)&&(instrument.high[instrument.high.length-1]>instrument.high[instrument.high.length-2]))  
            trading.buy instrument, 'limit', maximumBuyAmount, instrument.price, _orderTimeout  
        if ((maximumSellAmount >= MINIMUM_AMOUNT)&&(instrument.high[instrument.high.length-1]<instrument.high[instrument.high.length-2]))  
            trading.sell instrument, 'limit', maximumSellAmount, instrument.price, _orderTimeout 
    else
        #kaufe nur wenn gerade nichts gekauft ist
        if ((assetsAvailable==0)&&(maximumBuyAmount >= MINIMUM_AMOUNT)&&(instrument.high[instrument.high.length-1]>instrument.high[instrument.high.length-2]))  
            trading.buy instrument, 'limit', maximumBuyAmount, instrument.price, _orderTimeout  
        if ((maximumSellAmount >= MINIMUM_AMOUNT)&&(instrument.high[instrument.high.length-1]<instrument.high[instrument.high.length-2]))  
            trading.sell instrument, 'limit', maximumSellAmount, instrument.price, _orderTimeout 

onRestart: ->  
    debug "Bot restarted at #{new Date(data.at)}"  

onStop: ->  
    instrument = data.instruments[0] 
    debug "Bot started at #{new Date(storage.botStartedAt)}"  
    debug "Bot stopped at #{new Date(data.at)}"  

    trading.sell instrument    #verkaufe alles um einen Endpreis zu erhalten
    currentBalance = @portfolios[instrument.market].positions[instrument.base()].amount 
    botProfit = ((currentBalance / storage.startBalance - 1)*100) 
    buhProfit = ((instrument.price / storage.startPrice - 1)*100) 

    info "Bot Profit = #{botProfit.toFixed(2)}%" 
    info "Hodl Profit = #{buhProfit.toFixed(2)}%" 