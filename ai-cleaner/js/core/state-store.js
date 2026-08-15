(() => {
'use strict';
const ns=window.AICleanerModules=window.AICleanerModules||{};
function emptyState(){
  return {
    original:'',base:'',issueBase:'',working:'',chars:[],allChars:[],issues:[],applied:new Set(),
    manual:false,homoglyphs:[],reviews:[],score:100,focusCycles:Object.create(null),
    issueUnread:false,reviewUnread:false,techUnread:false,analyzeMs:0,reviewOverflow:0
  };
}
ns.createTextStateStore=function createTextStateStore({factory=emptyState}={}){
  const state=factory();let revision=0;
  function replace(next){
    const value=next&&typeof next==='object'?next:factory();
    for(const key of Object.keys(state))delete state[key];
    Object.assign(state,value);revision++;return state;
  }
  return{
    state,
    reset(){return replace(factory());},
    replace,
    patch(next){if(next&&typeof next==='object'){Object.assign(state,next);revision++;}return state;},
    touch(){revision++;return revision;},
    get revision(){return revision;},
    snapshot(){return{...state,applied:new Set(state.applied||[]),focusCycles:{...(state.focusCycles||{})},revision};}
  };
};
})();
