(function(){
var S=window.PLANO.data,RO=window.PLANO.readOnly;
var DAY=864e5,ZOOMS=[6,9,12,16,22],ZI=2;try{var z=+localStorage.getItem('plano-zoom');if(z>=0&&z<ZOOMS.length&&localStorage.getItem('plano-zoom')!==null)ZI=z}catch(_){}
var PX=ZOOMS[ZI];
var TABS={gantt:'Gantt',tarefas:'Tarefas',sequencia:'Sequência'};
function hashTab(){var t=(location.hash||'').slice(1);return TABS[t]?t:null}
var TAB=hashTab();if(!TAB){try{TAB=localStorage.getItem('plano-tab')}catch(_){}if(!TABS[TAB])TAB='gantt'}
var scrolledToday=false;
var START=Date.UTC(2026,9,1),END=Date.UTC(2027,1,1);
function calcRange(){var lo=Date.UTC(2026,9,1),hi=Date.UTC(2027,0,31);
  S.tasks.forEach(function(t){var a=d(t.start),b=d(t.end>(t.realEnd||'')?t.end:t.realEnd);if(a<lo)lo=a;if(b>hi)hi=b});
  if(S.milestone&&S.milestone.end){var m=d(S.milestone.end);if(m>hi)hi=m}
  var x=new Date(lo);START=Date.UTC(x.getUTCFullYear(),x.getUTCMonth(),1);x=new Date(hi+15*864e5);END=Date.UTC(x.getUTCFullYear(),x.getUTCMonth()+1,1)}
var COLL={};try{COLL=JSON.parse(localStorage.getItem('plano-collapsed')||'{}')||{}}catch(_){COLL={}}
var armedPh=null;
function saveColl(){try{localStorage.setItem('plano-collapsed',JSON.stringify(COLL))}catch(_){}}
function collBtn(p){var c=!!COLL[p.id];return '<button class="coll'+(c?' shut':'')+'" type="button" data-coll="'+p.id+'" aria-expanded="'+(!c)+'" aria-label="'+(c?'Expandir ':'Recolher ')+esc(p.name)+'" title="'+(c?'Expandir':'Recolher')+'"></button>'}
function collAllBtn(){var any=S.phases.some(function(p){return !COLL[p.id]});return '<button class="btn collall" type="button" data-collall="1">'+(any?'Recolher fases':'Expandir fases')+'</button>'}
var PCOL=['--p1','--p2','--p3','--p4','--p5','--p6'];
var MES=['jan','fev','mar','abr','mai','jun','jul','ago','set','out','nov','dez'];
var MESL=['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
var showCols=false;try{showCols=localStorage.getItem('plano-cols2')==='1'}catch(_){}
var art=null,timer=null,armed=null,saveMsg=window.PLANO.message||'',focusAfter=null,movedId=null;
var now=new Date(),TODAY=Date.UTC(now.getFullYear(),now.getMonth(),now.getDate());
S.tasks.forEach(function(k){
  if(k.pct==null){k.pct=k.status==='feito'?100:k.status==='em curso'?50:0}
  delete k.status;if(k.realStart==null)k.realStart='';if(k.owner==null)k.owner='';if(k.notes==null)k.notes=k.note||'';delete k.note;if(!k.realEnd)k.realEnd=k.end;if(k.area==null)k.area='';
});
function d(s){var p=s.split('-');return Date.UTC(+p[0],p[1]-1,+p[2])}
function off(s){return (d(s)-START)/DAY}
function offT(t){return (t-START)/DAY}
function iso(t){return new Date(t).toISOString().slice(0,10)}
function p2(n){return (n<10?'0':'')+n}
function fmt(s){if(!s)return '';var x=new Date(d(s));return p2(x.getUTCDate())+'/'+p2(x.getUTCMonth()+1)+'/'+x.getUTCFullYear()}
function pdate(v){v=String(v||'').trim();if(/^\d{4}-\d{2}-\d{2}$/.test(v))return v;
  var m=v.match(/^(\d{1,2})\D+(\d{1,2})\D+(\d{4}|\d{2})$/)||v.match(/^(\d{2})(\d{2})(\d{4})$/);if(!m)return null;
  var dd=+m[1],mm=+m[2],yy=+m[3];if(m[3].length===2)yy+=2000;var t=Date.UTC(yy,mm-1,dd),x=new Date(t);
  if(x.getUTCFullYear()!==yy||x.getUTCMonth()!==mm-1||x.getUTCDate()!==dd)return null;return iso(t)}
var DATEF={start:1,end:1,realStart:1,realEnd:1};
function dIn(k,f,id,cls,label){return '<span class="dfield"><input class="'+cls+' dtxt" type="text" inputmode="numeric" autocomplete="off" placeholder="dd/mm/aaaa" maxlength="10" id="'+id+'" data-id="'+k.id+'" data-f="'+f+'" value="'+fmt(k[f])+'" aria-label="'+label+'"><span class="cal" aria-hidden="true"></span><input class="dpick" type="date" tabindex="-1" aria-hidden="true" data-id="'+k.id+'" data-f="'+f+'" value="'+k[f]+'"></span>'}
function esc(s){return String(s).replace(/[&<>"]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]})}
function status(k){return k.pct>=100?'feito':k.pct>0?'em curso':'por fazer'}
function slug(s){return s.replace(/\s+/g,'-')}
function byId(id){for(var i=0;i<S.tasks.length;i++)if(S.tasks[i].id===id)return S.tasks[i];return null}
function tasksOf(p){return S.tasks.filter(function(t){return t.phase===p}).sort(function(a,b){return a.start<b.start?-1:a.start>b.start?1:(a.end<b.end?-1:1)})}
function range(ts){if(!ts.length)return 'sem tarefas';var sp=span(ts);return fmt(sp[0])+' – '+fmt(sp[1])}
function span(ts){var a=ts[0].start,b=ts[0].end;ts.forEach(function(t){if(t.start<a)a=t.start;if(t.end>b)b=t.end});return [a,b]}
function ndays(t){return Math.round((d(t.end)-d(t.start))/DAY)+1}
function phase(id){for(var i=0;i<S.phases.length;i++)if(S.phases[i].id===id)return S.phases[i]}
function late(k){var re=k.realEnd||k.end;if(d(re)>d(k.end))return true;return k.pct<100&&TODAY>d(re)}
function rcell(k){var lt=k.realEnd&&d(k.realEnd)>d(k.end);return '<span class="g-dt g-ed g-re'+(lt?' lt':'')+'" title="Data real de conclusão'+(lt?' (depois do fim planeado)':'')+'">'+dIn(k,'realEnd','gre-'+k.id,'gd','Data real de conclusão de '+esc(k.name))+'</span>'}
function uniq(f){var o={};S.tasks.forEach(function(t){if(t[f])o[t[f]]=1});return Object.keys(o).sort(function(a,b){return a.localeCompare(b,'pt')})}
function acell(k){return '<span class="g-dt g-ar g-ed"><input class="gd ga" id="ga-'+k.id+'" data-id="'+k.id+'" data-f="area" value="'+esc(k.area)+'" placeholder="—" list="dl-area" aria-label="Área de '+esc(k.name)+'"></span>'}
function xcell(k){var a=armed===k.id;return '<span class="g-dt g-del"><button class="btn dup" type="button" data-dup="'+k.id+'" title="Copiar tarefa" aria-label="Copiar '+esc(k.name)+'"></button><button class="btn del'+(a?' arm':'')+'" data-del="'+k.id+'" title="Apagar tarefa" aria-label="'+(a?'Confirmar apagar ':'Apagar ')+esc(k.name)+'">'+(a?'Apagar?':'×')+'</button></span>'}
function fcell(k){return '<span class="g-dt g-fs g-ed"><select class="gd gsel" id="gph-'+k.id+'" data-id="'+k.id+'" data-f="phase" aria-label="Mover '+esc(k.name)+' para outra fase" title="Mover para outra fase">'+S.phases.map(function(q){return '<option value="'+q.id+'"'+(q.id===k.phase?' selected':'')+'>'+esc(q.name.split(' · ')[0])+'</option>'}).join('')+'</select></span>'}
function dcell(k,f,r,lt){return '<span class="g-dt g-ed">'+dIn(k,f,'g'+f+'-'+k.id,'gd',(f==='start'?'Início':'Fim')+' planeado de '+esc(k.name))+(r?'<small'+(lt?' class="lt"':'')+'>real '+fmt(r)+'</small>':'')+'</span>'}
function phasePct(ts){if(!ts.length)return 0;var w=0,s=0;ts.forEach(function(k){var n=ndays(k);w+=n;s+=n*k.pct});return Math.round(s/w)}

function render(){
  var app=document.getElementById('app');
  calcRange();var days=Math.round((END-START)/DAY),tw=days*PX,h='';
  var allPct=phasePct(S.tasks);
  h+='<header><div class="eyebrow">Obra · outubro 2026 a janeiro 2027</div><h1>Plano da Obra</h1>'+
     '<p class="lede">'+S.phases.length+' fases'+(S.tasks.length?' até '+fmt(span(S.tasks)[1]):'')+', '+allPct+'% feito no total. '+esc(S.milestone.name)+': '+esc(S.milestone.note)+'.</p><div class="phases">';
  S.phases.forEach(function(p){var ts=tasksOf(p.id),dn=ts.filter(function(t){return t.pct>=100}).length,pct=phasePct(ts),lt=ts.filter(late).length;
    h+='<div class="ph" style="--pc:var('+p.color+')"><div class="ph-name"><i></i>'+esc(p.name)+'<b class="ph-pct">'+pct+'%</b></div><div class="ph-dates">'+range(ts)+'</div><div class="ph-bar"><span style="width:'+pct+'%"></span></div><div class="ph-count">'+dn+' de '+ts.length+' concluídas'+(lt?' · <span class="late-t">'+lt+' atrasada'+(lt>1?'s':'')+'</span>':'')+'</div></div>'});
  h+='</div></header>';
  h+='<nav class="tabs" role="tablist">'+Object.keys(TABS).map(function(t){return '<button class="tab'+(t===TAB?' on':'')+'" type="button" role="tab" aria-selected="'+(t===TAB)+'" data-tab="'+t+'">'+TABS[t]+'</button>'}).join('')+'</nav>';
  // Gantt
  h+='<section class="sec pane pane-gantt"'+(TAB==='gantt'?'':' hidden')+'><div class="sec-head"><h2>Gantt</h2><div class="legend"><span><i class="lg l-plan"></i>Planeado, preenchido até à % feita</span><span><i class="lg l-real"></i>Real (início a conclusão)</span><span><i class="lg l-hoje"></i>Hoje</span></div><div class="g-tools"><span class="zl">Zoom</span><button class="btn zm" type="button" data-zoom="-1" aria-label="Diminuir zoom"'+(ZI===0?' disabled':'')+'>−</button><button class="btn zm" type="button" data-zoom="1" aria-label="Aumentar zoom"'+(ZI===ZOOMS.length-1?' disabled':'')+'>+</button><button class="btn zm" type="button" data-today="1">Hoje</button>'+collAllBtn()+'<button class="btn cols" type="button" data-cols="1">'+(showCols?'Ocultar colunas':'Mostrar colunas')+'</button></div></div>';
  h+='<p class="hint">O círculo de cada tarefa avança 0% → 50% → 100%. Para editar fase, área, responsável, datas e anotações use o separador Tarefas, ou carregue em Mostrar colunas.</p>';
  h+='<div class="gantt'+(showCols?'':' no-cols')+'"><div class="gi" style="width:calc(var(--lw) + '+tw+'px)"><div class="g-head"><div class="g-left"><span class="g-name">Tarefa</span></div><div class="g-cols"><span class="g-dt g-fs">Fase</span><span class="g-dt g-ar">Área</span><span class="g-dt g-ow">Responsável</span><span class="g-dt g-pc">%</span><span class="g-dt">Início</span><span class="g-dt">Fim</span><span class="g-dt g-re">Concluído</span><span class="g-dt g-del"></span></div><div class="g-scale" style="width:'+tw+'px">';
  var t,mo=[];
  for(t=START;t<END;){var x=new Date(t),nx=Date.UTC(x.getUTCFullYear(),x.getUTCMonth()+1,1);mo.push([t,nx]);t=nx}
  mo.forEach(function(m){var x=new Date(m[0]);h+='<div class="m-lbl" style="left:'+(offT(m[0])*PX)+'px;width:'+((m[1]-m[0])/DAY*PX)+'px">'+MESL[x.getUTCMonth()]+'</div>'});
  var mondays=[];for(t=START;t<END;t+=DAY){if(new Date(t).getUTCDay()===1)mondays.push(t)}
  mondays.forEach(function(m){h+='<div class="w-lbl" style="left:'+(offT(m)*PX)+'px">'+new Date(m).getUTCDate()+'</div>'});
  h+='</div></div><div class="g-body"><div class="g-overlay" style="width:'+tw+'px">';
  mondays.forEach(function(m){h+='<div class="wl" style="left:'+(offT(m)*PX)+'px"></div>'});
  mo.forEach(function(m){h+='<div class="ml" style="left:'+(offT(m[0])*PX)+'px"></div>'});
  if(TODAY>=START&&TODAY<END)h+='<div class="today" style="left:'+(offT(TODAY)*PX+PX/2)+'px"><b>Hoje</b></div>';
  h+='</div>';
  S.phases.forEach(function(p){var ts=tasksOf(p.id);var pc='style="--pc:var('+p.color+')"';
    var ps=ts.length?span(ts):null;h+='<div class="g-row g-phase" '+pc+'><div class="g-left">'+collBtn(p)+'<span class="g-name">'+esc(p.name)+(COLL[p.id]?'<small class="ph-n">'+ts.length+' tarefa'+(ts.length===1?'':'s')+'</small>':'')+'</span></div><div class="g-cols"><span class="g-dt g-fs"></span><span class="g-dt g-ar"></span><span class="g-dt g-ow"></span><span class="g-dt g-pc">'+phasePct(ts)+'%</span><span class="g-dt">'+(ps?fmt(ps[0]):'')+'</span><span class="g-dt">'+(ps?fmt(ps[1]):'')+'</span><span class="g-dt g-re"></span><span class="g-dt g-del"></span></div><div class="g-track" style="width:'+tw+'px">';
    if(ts.length){var sp=span(ts);h+='<div class="g-span" style="left:'+(off(sp[0])*PX)+'px;width:'+((off(sp[1])-off(sp[0])+1)*PX)+'px"></div>'}
    h+='</div></div>';
    (COLL[p.id]?[]:ts).forEach(function(k){var st=slug(status(k)),lt=late(k);
      var sub=[];if(lt)sub.push('<span class="late-t">atrasada</span>');if(k.notes)sub.push('<span class="g-note" title="'+esc(k.notes)+'">'+esc(k.notes.split('\n')[0])+'</span>');
      h+='<div class="g-row" '+pc+'><div class="g-left"><button class="st st-'+st+'" data-cycle="'+k.id+'" aria-label="'+esc(k.name)+': '+k.pct+'% feito" title="'+k.pct+'% feito"></button><span class="g-name"><input class="gd gn" id="gn-'+k.id+'" data-id="'+k.id+'" data-f="name" value="'+esc(k.name)+'" aria-label="Nome da tarefa">'+(sub.length?'<small>'+sub.join(' · ')+'</small>':'')+'</span></div><div class="g-cols">'+fcell(k)+acell(k)+'<span class="g-dt g-ow g-ed"><input class="gd go" id="go-'+k.id+'" data-id="'+k.id+'" data-f="owner" value="'+esc(k.owner)+'" placeholder="—" list="dl-owner" aria-label="Responsável por '+esc(k.name)+'"></span><span class="g-dt g-pc g-ed"><input class="gd gp" type="number" min="0" max="100" step="5" id="gp-'+k.id+'" data-id="'+k.id+'" data-f="pct" value="'+k.pct+'" aria-label="% feita de '+esc(k.name)+'"></span>'+dcell(k,'start',k.realStart,false)+dcell(k,'end','',false)+rcell(k)+xcell(k)+'</div>'+
         '<div class="g-track" style="width:'+tw+'px"><div class="bar'+(lt?' b-late':'')+'" style="left:'+(off(k.start)*PX)+'px;width:'+(ndays(k)*PX)+'px" title="'+esc(k.name)+' · planeado '+fmt(k.start)+' – '+fmt(k.end)+'"><i class="fill" style="width:'+k.pct+'%"></i><span class="bar-d"><b>'+k.pct+'%</b> '+fmt(k.start)+(k.start!==k.end?' – '+fmt(k.end):'')+'</span></div>';
      if(k.realStart){var rs=d(k.realStart),re=k.realEnd?d(k.realEnd):Math.max(TODAY,rs);if(re<rs)re=rs;
        var dn=k.pct>=100;re=dn?d(k.realEnd||k.end):Math.max(TODAY,rs);if(re<rs)re=rs;
        h+='<div class="real'+(dn?'':' open')+'" style="left:'+(offT(rs)*PX)+'px;width:'+(((re-rs)/DAY+1)*PX)+'px" title="Real: '+fmt(k.realStart)+' – '+(dn?fmt(k.realEnd||k.end):'em curso')+'"></div>'}
      h+='</div></div>'});
    if(!COLL[p.id])h+='<div class="g-row g-add" '+pc+'><div class="g-left"><button class="btn add" data-add="'+p.id+'" data-where="g">+ Tarefa na '+esc(p.name.split(' · ')[0])+'</button></div><div class="g-cols"></div><div class="g-track" style="width:'+tw+'px"></div></div>';
  });
  h+='<div class="g-row g-add g-addph"><div class="g-left"><button class="btn add addph" type="button" data-addphase="1">+ Nova fase</button></div><div class="g-cols"></div><div class="g-track" style="width:'+tw+'px"></div></div>';
  var M=S.milestone;
  h+='<div class="g-row"><div class="g-left"><span class="g-name"><b>'+esc(M.name)+'</b><small>'+esc(M.note)+'</small></span></div><div class="g-cols"><span class="g-dt g-fs"></span><span class="g-dt g-ar"></span><span class="g-dt g-ow"></span><span class="g-dt g-pc"></span><span class="g-dt">jan</span><span class="g-dt"><small>a decidir</small></span><span class="g-dt g-re"></span><span class="g-dt g-del"></span></div><div class="g-track" style="width:'+tw+'px"><div class="ms-band" style="left:'+(off(M.start)*PX)+'px;width:'+((off(M.end)-off(M.start)+1)*PX)+'px"><span>'+esc(M.name)+' · a decidir</span></div></div></div>';
  h+='</div></div></div></section>';
  // Sequence
  var bad=0,items='';
  S.deps.forEach(function(dp){var a=byId(dp.before),b=byId(dp.after);if(!a||!b)return;var ok=d(b.start)>d(a.end);if(!ok)bad++;
    items+='<li class="'+(ok?'':'bad')+'"><span class="ck">'+(ok?'✓':'!')+'</span><p>'+esc(a.name)+' → '+esc(b.name)+'<small>'+esc(dp.why)+(ok?'':' Datas sobrepostas: '+fmt(a.end)+' / '+fmt(b.start)+'.')+'</small></p></li>'});
  h+='<section class="sec pane"'+(TAB==='sequencia'?'':' hidden')+'><div class="sec-head"><h2>Sequência</h2><span class="save">'+(bad?bad+' ponto'+(bad>1?'s':'')+' a rever':'Tudo pela ordem certa')+'</span></div><ul class="checks">'+items+'</ul></section>';
  // Planning
  h+='<section class="sec pane"'+(TAB==='tarefas'?'':' hidden')+'><div class="sec-head"><h2>Tarefas</h2>'+collAllBtn()+'<span class="save" id="save">'+esc(saveMsg)+'</span></div>';
  h+='<p class="hint">As datas planeadas são uma estimativa. Ao passar de 0% é preenchido o início real com a data de hoje, e ao chegar a 100% a conclusão real; pode corrigir as duas.</p>';
  h+='<div class="plan"><table><thead><tr><th class="c-name">Tarefa</th><th class="c-phase">Fase</th><th class="c-area">Área</th><th>Responsável</th><th colspan="2" class="grp">Planeado</th><th colspan="2" class="grp">Real</th><th>% feita</th><th class="c-notes">Anotações</th><th></th></tr>'+
     '<tr class="sub"><th></th><th></th><th></th><th></th><th>Início</th><th>Fim</th><th>Início</th><th>Conclusão</th><th></th><th></th><th></th></tr></thead><tbody>';
  S.phases.forEach(function(p){var pc='style="--pc:var('+p.color+')"';
    var nt=tasksOf(p.id).length;h+='<tr class="ph-row" '+pc+'><td colspan="11"><div class="ph-cell">'+collBtn(p)+'<i></i><input class="in ph-name" id="phn-'+p.id+'" data-pid="'+p.id+'" value="'+esc(p.name)+'" aria-label="Nome da fase"><small class="ph-n">'+nt+' tarefa'+(nt===1?'':'s')+'</small>'+(nt?'':'<button class="btn del'+(armedPh===p.id?' arm':'')+'" type="button" data-delphase="'+p.id+'" title="Apagar fase vazia">'+(armedPh===p.id?'Apagar fase?':'Apagar fase')+'</button>')+'</div></td></tr>';
    (COLL[p.id]?[]:tasksOf(p.id)).forEach(function(k){var lt=k.realEnd&&d(k.realEnd)>d(k.end);
      h+='<tr '+pc+'><td><input class="in" id="n-'+k.id+'" data-id="'+k.id+'" data-f="name" value="'+esc(k.name)+'" aria-label="Nome da tarefa"></td>'+
        '<td class="c-phase"><select class="in ph-sel" id="ph-'+k.id+'" data-id="'+k.id+'" data-f="phase" aria-label="Mover '+esc(k.name)+' para outra fase">'+S.phases.map(function(q){return '<option value="'+q.id+'"'+(q.id===k.phase?' selected':'')+'>'+esc(q.name.split(' · ')[0])+'</option>'}).join('')+'</select></td>'+
        '<td class="c-area"><input class="in" id="ar-'+k.id+'" data-id="'+k.id+'" data-f="area" value="'+esc(k.area)+'" placeholder="Área" list="dl-area" aria-label="Área"></td>'+
        '<td><input class="in" id="o-'+k.id+'" data-id="'+k.id+'" data-f="owner" value="'+esc(k.owner)+'" placeholder="Nome" list="dl-owner" aria-label="Responsável"></td>'+
        '<td>'+dIn(k,'start','s-'+k.id,'in','Início planeado')+'</td>'+
        '<td>'+dIn(k,'end','e-'+k.id,'in','Fim planeado')+'</td>'+
        '<td class="real-c">'+dIn(k,'realStart','rs-'+k.id,'in','Início real')+'</td>'+
        '<td class="real-c">'+dIn(k,'realEnd','re-'+k.id,'in'+(lt?' is-late':''),'Conclusão real')+'</td>'+
        '<td><div class="pct"><input class="in" type="number" min="0" max="100" step="5" id="p-'+k.id+'" data-id="'+k.id+'" data-f="pct" value="'+k.pct+'" aria-label="Percentagem feita"><span>%</span><i style="--w:'+k.pct+'%"></i></div></td>'+
        '<td class="c-notes"><textarea class="in notes" rows="1" id="nt-'+k.id+'" data-id="'+k.id+'" data-f="notes" placeholder="Anotações" aria-label="Anotações de '+esc(k.name)+'">'+esc(k.notes)+'</textarea></td>'+
        '<td class="c-act"><button class="btn dup" type="button" data-dup="'+k.id+'" title="Copiar tarefa" aria-label="Copiar '+esc(k.name)+'"></button><button class="btn del'+(armed===k.id?' arm':'')+'" data-del="'+k.id+'" title="Apagar tarefa" aria-label="Apagar '+esc(k.name)+'">'+(armed===k.id?'Apagar?':'×')+'</button></td></tr>'});
    if(!COLL[p.id])h+='<tr '+pc+'><td colspan="11"><button class="btn add" data-add="'+p.id+'" data-where="t">+ Tarefa na '+esc(p.name.split(' · ')[0])+'</button></td></tr>';
  });
  h+='<tr><td colspan="11"><button class="btn add addph" type="button" data-addphase="1">+ Nova fase</button></td></tr>';
  h+='</tbody></table></div></section>';
  h+='<datalist id="dl-area">'+uniq('area').map(function(v){return '<option value="'+esc(v)+'">'}).join('')+'</datalist><datalist id="dl-owner">'+uniq('owner').map(function(v){return '<option value="'+esc(v)+'">'}).join('')+'</datalist>';
  app.innerHTML=h;
  if(focusAfter){var fe=document.getElementById(focusAfter);focusAfter=null;if(fe){fe.focus();try{fe.select()}catch(_){};fe.scrollIntoView({block:'center'})}}
  if(movedId){['ph-','gph-'].forEach(function(pre){var el=document.getElementById(pre+movedId);var row=el&&el.closest('tr,.g-row');if(row){row.classList.add('moved');setTimeout(function(){row.classList.remove('moved')},1600)}});movedId=null}
}
function setSave(m){saveMsg=m;var el=document.getElementById('save');if(el)el.textContent=m}
function doSave(){timer=null;setSave('A guardar…');return window.PLANO.save(S).then(setSave,function(e){setSave(e.message);throw e})}
function changed(){render();if(RO)return;setSave('Alterações por guardar…');clearTimeout(timer);timer=setTimeout(function(){doSave().catch(function(){})},1500)}
window.PLANO.pending=function(){return !!timer};
window.PLANO.flush=function(){if(!timer)return Promise.resolve();clearTimeout(timer);return doSave()};
window.PLANO.status=setSave;
window.PLANO.rerender=function(n){S=n;render()};
function setPct(k,v){var was=k.pct;k.pct=v;
  if(v>0&&was===0&&!k.realStart)k.realStart=iso(TODAY);
  if(!k.realEnd)k.realEnd=k.end;
  if(v<100&&was>=100)k.realEnd=k.end;}
var app=document.getElementById('app');
app.addEventListener('click',function(e){
  if(e.target.closest('[data-cols]')){showCols=!showCols;try{localStorage.setItem('plano-cols2',showCols?'1':'0')}catch(_){}render();return}
  var cb=e.target.closest('[data-coll]');if(cb){var pid=cb.dataset.coll;if(COLL[pid])delete COLL[pid];else COLL[pid]=1;saveColl();render();return}
  if(e.target.closest('[data-collall]')){var any=S.phases.some(function(p){return !COLL[p.id]});COLL={};if(any)S.phases.forEach(function(p){COLL[p.id]=1});saveColl();render();return}
  if(e.target.closest('[data-addphase]')){var n=S.phases.length+1,last=S.tasks.length?span(S.tasks)[1]:iso(TODAY),np={id:'f'+Date.now().toString(36),name:'Fase '+n,color:PCOL[(n-1)%PCOL.length],start:iso(d(last)+DAY)};
    S.phases.push(np);delete COLL[np.id];armed=null;armedPh=null;if(TAB==='tarefas')focusAfter='phn-'+np.id;changed();return}
  var dp=e.target.closest('[data-delphase]');if(dp){var pid2=dp.dataset.delphase;if(tasksOf(pid2).length)return;if(armedPh===pid2){S.phases=S.phases.filter(function(p){return p.id!==pid2});armedPh=null;changed()}else{armedPh=pid2;render()}return}
  if(armedPh){armedPh=null;render()}
  var tb=e.target.closest('[data-tab]');if(tb){setTab(tb.dataset.tab);return}
  var zb=e.target.closest('[data-zoom]');if(zb){var g=document.querySelector('.gantt'),mid=g?(g.scrollLeft+g.clientWidth/2-gLeft())/PX:0;ZI=Math.max(0,Math.min(ZOOMS.length-1,ZI+(+zb.dataset.zoom)));PX=ZOOMS[ZI];try{localStorage.setItem('plano-zoom',ZI)}catch(_){}render();g=document.querySelector('.gantt');if(g)g.scrollLeft=mid*PX+gLeft()-g.clientWidth/2;return}
  if(e.target.closest('[data-today]')){toToday();return}
  var c=e.target.closest('[data-cycle]');
  if(c){var k=byId(c.dataset.cycle);setPct(k,k.pct>=100?0:k.pct>=50?100:50);if(k.pct===0){k.realStart='';k.realEnd=k.end}changed();return}
  var a=e.target.closest('[data-add]');
  if(a){var p=phase(a.dataset.add),st=p.start;var nid='t'+Date.now().toString(36);S.tasks.push({id:nid,phase:p.id,name:'Nova tarefa',area:'',owner:'',notes:'',start:st,end:iso(d(st)+2*DAY),pct:0,realStart:'',realEnd:iso(d(st)+2*DAY)});armed=null;focusAfter=(a.dataset.where==='g'?'gn-':'n-')+nid;changed();return}
  var cp=e.target.closest('[data-dup]');
  if(cp){var src=byId(cp.dataset.dup);if(!src)return;var c=JSON.parse(JSON.stringify(src));c.id='t'+Date.now().toString(36);c.name=src.name+' (cópia)';c.pct=0;c.realStart='';c.realEnd=c.end;
    S.tasks.splice(S.tasks.indexOf(src)+1,0,c);armed=null;focusAfter=(cp.closest('.g-row')?'gn-':'n-')+c.id;movedId=c.id;changed();return}
  var x=e.target.closest('[data-del]');
  if(x){var id=x.dataset.del;if(armed===id){S.tasks=S.tasks.filter(function(t){return t.id!==id});S.deps=S.deps.filter(function(dp){return dp.before!==id&&dp.after!==id});armed=null;changed()}else{armed=id;render()}return}
  if(armed){armed=null;render()}
});
app.addEventListener('change',function(e){var el=e.target,id=el.dataset.id,f=el.dataset.f;
  if(el.dataset&&el.dataset.pid){var ph=phase(el.dataset.pid),nv=el.value.trim();if(ph&&nv&&nv!==ph.name){ph.name=nv;changed()}else render();return}
  if(!id||!f)return;var k=byId(id);if(!k)return;
  var v=el.value.trim();
  if(f==='owner'){k.owner=v;changed();return}
  if(f==='area'){k.area=v;changed();return}
  if(f==='phase'){if(!phase(v)||v===k.phase)return;k.phase=v;focusAfter=(el.id.indexOf('gph-')===0?'gph-':'ph-')+id;movedId=id;changed();return}
  if(DATEF[f]){
    if(v===''){if(f==='realStart')k.realStart='';else if(f==='realEnd')k.realEnd=k.end;else{render();return}changed();return}
    var pv=pdate(v);if(!pv){setSave('Data inválida: escreva dd/mm/aaaa');render();return}v=pv;
    if(f==='end'&&(!k.realEnd||k.realEnd===k.end)&&k.pct<100)k.realEnd=v;
  }
  if(f==='notes'){k.notes=el.value.replace(/\s+$/,'');changed();return}
  if(f==='pct'){var n=Math.round(+v);if(v===''||isNaN(n)){render();return}setPct(k,Math.max(0,Math.min(100,n)));changed();return}
  if(f==='realStart'||f==='realEnd'){k[f]=v;if(k.realStart&&k.realEnd&&k.realEnd<k.realStart){if(f==='realStart')k.realEnd=v;else k.realStart=v}
    if(f==='realEnd'&&v&&k.pct<100&&d(v)<=TODAY&&v!==k.end)k.pct=100;changed();return}
  if(!v){render();return}
  k[f]=v;if(f==='start'&&k.end<k.start)k.end=k.start;if(f==='end'&&k.end<k.start)k.start=k.end;changed()});
app.addEventListener('click',function(e){var p=e.target.closest('.dpick');if(p&&p.showPicker){try{p.showPicker()}catch(_){}}});
app.addEventListener('input',function(e){var el=e.target;if(!el.classList||!el.classList.contains('dtxt')||e.inputType!=='insertText')return;
  if(/^\d{2}$/.test(el.value)||/^\d{2}\/\d{2}$/.test(el.value))el.value+='/'});
function gLeft(){var g=document.querySelector('.gantt .g-head .g-left'),c=document.querySelector('.gantt .g-head .g-cols');return (g?g.offsetWidth:0)+(c&&c.offsetParent?c.offsetWidth:0)}
function toToday(){var g=document.querySelector('.gantt');if(!g||g.closest('[hidden]'))return;g.scrollLeft=Math.max(0,offT(TODAY)*PX-g.clientWidth*0.3+gLeft()*0.3)}
function setTab(t){if(!TABS[t])return;TAB=t;try{localStorage.setItem('plano-tab',t)}catch(_){}if(location.hash!=='#'+t){try{history.replaceState(null,'','#'+t)}catch(_){location.hash=t}}render();if(t==='gantt'&&!scrolledToday){scrolledToday=true;toToday()}}
window.addEventListener('hashchange',function(){var t=hashTab();if(t&&t!==TAB)setTab(t)});
render();
if(TAB==='gantt'){scrolledToday=true;toToday()}
})();
