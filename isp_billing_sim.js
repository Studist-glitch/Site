/* isp_billing_sim.js — тонкая обёртка над daily.js */
(function (global) {
'use strict';
const NB = global.NB;
NB.sim = NB.sim || {};
NB.sim.dayWarnings = NB.daily.dayWarnings;
NB.sim.canAdvance = NB.daily.canAdvanceDay || (() => NB.canAdvanceDay().ok);
NB.advanceDay = () => NB.daily.advanceDay();
})(window);