(function(){
var S=window.PLANO.data,RO=window.PLANO.readOnly;
var DAY=864e5,PX=7;
var START=Date.UTC(2026,9,1),END=Date.UTC(2027,1,1);
var MES=['jan','fev','mar','abr','mai','jun','jul','ago','set','out','nov','dez'];
var MESL=['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
var art=null,timer=null,armed=null,saveMsg=window.PLANO.message||'',focusAfter=null;
var now=new Date(),TODAY=Date.UTC(now.getFullYear(),now.getMonth(),now.getDate());
S.tasks.forEach(function(k){
  if(k.pct==null){k.pct=k.status==='feito'?100:k.status==='em curso'?50:0}
  delete k.status;if(k.realStart==null)k.realStart='';if(k.owner==null)k.owner='';if(k.realEnd==null)k.realEnd='';
});
function d(s){var p=s.split('-');return Date.UTC(+p[0],p[1]-1,+p[2])}
function off(s){return (d(s)-START)/DAY}
function offT(t){return (t-START)/DAY}
function iso(t){return new Date(t).toISOString().slice(0,10)}
function fmt(s){var x=new Date(d(s));return x.getUTCDate()+' '+MES[x.getUTCMonth()]}
function esc(s){return String(s).replace(/[&<>"]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]})}
function status(k){return k.pct>=100?'feito':k.pct>0?'em curso':'por fazer'}
function slug(s){return s.replace(/\s+/g,'-')}
function byId(id){for(var i=0;i<S.tasks.length;i++)if(S.tasks[i].id===id)return S.tasks[i];return null}
function tasksOf(p){return S.tasks.filter(function(t){return t.phase===p}).sort(function(a,b){return a.start<b.start?-1:a.start>b.start?1:(a.end<b.end?-1:1)})}
function range(ts){if(!ts.length)return 'sem tarefas';var sp=span(ts);return fmt(sp[0])+' – '+fmt(sp[1])}
function span(ts){var a=ts[0].start,b=ts[0].end;ts.forEach(function(t){if(t.start<a)a=t.start;if(t.end>b)b=t.end});return [a,b]}
function ndays(t){return Math.round((d(t.end)-d(t.start))/DAY)+1}
function phase(id){for(var i=0;i<S.phases.length;i++)if(S.phases[i].id===id)return S.phases[i]}
function late(k){if(k.realEnd)return d(k.realEnd)>d(k.end);return k.pct<100&&TODAY>d(k.end)}
function dcell(k,f,r,lt){return '<span class="g-dt g-ed"><input class="gd" type="date" id="g'+f+'-'+k.id+'" data-id="'+k.id+'" data-f="'+f+'" value="'+k[f]+'" aria-label="'+(f==='start'?'Início':'Fim')+' planeado de '+esc(k.name)+'">'+(r?'<small'+(lt?' class="lt"':'')+'>real '+fmt(r)+'</small>':'')+'</span>'}
function phasePct(ts){if(!ts.length)return 0;var w=0,s=0;ts.forEach(function(k){var n=ndays(k);w+=n;s+=n*k.pct});return Math.round(s/w)}

function render(){
  var app=document.getElementById('app');
  var days=Math.round((END-START)/DAY),tw=days*PX,h='';
  var allPct=phasePct(S.tasks);
  h+='<header><div class="eyebrow">Obra · outubro 2026 a janeiro 2027</div><h1>Plano da Obra</h1>'+
     '<p class="lede">Três fases até 20 de dezembro, '+allPct+'% feito no total. '+esc(S.milestone.name)+': '+esc(S.milestone.note)+'.</p><div class="phases">';
  S.phases.forEach(function(p){var ts=tasksOf(p.id),dn=ts.filter(function(t){return t.pct>=100}).length,pct=phasePct(ts),lt=ts.filter(late).length;
    h+='<div class="ph" style="--pc:var('+p.color+')"><div class="ph-name"><i></i>'+esc(p.name)+'<b class="ph-pct">'+pct+'%</b></div><div class="ph-dates">'+range(ts)+'</div><div class="ph-bar"><span style="width:'+pct+'%"></span></div><div class="ph-count">'+dn+' de '+ts.length+' concluídas'+(lt?' · <span class="late-t">'+lt+' atrasada'+(lt>1?'s':'')+'</span>':'')+'</div></div>'});
  h+='</div></header>';
  // Gantt
  h+='<section class="sec"><div class="sec-head"><h2>Gantt</h2><div class="legend"><span><i class="lg l-plan"></i>Planeado, preenchido até à % feita</span><span><i class="lg l-real"></i>Real (início a conclusão)</span><span><i class="lg l-hoje"></i>Hoje</span></div></div>';
  h+='<p class="hint">O círculo de cada tarefa avança 0% → 50% → 100%. Nome, responsável, % feita e datas editam-se diretamente aqui ou no planeamento, mais abaixo.</p>';
  h+='<div class="gantt"><div class="gi" style="width:calc(var(--lw) + '+tw+'px)"><div class="g-head"><div class="g-left"><span class="g-name">Tarefa</span><span class="g-dt g-ow">Responsável</span><span class="g-dt g-pc">%</span><span class="g-dt">Início</span><span class="g-dt">Fim</span></div><div class="g-scale" style="width:'+tw+'px">';
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
    var ps=ts.length?span(ts):null;h+='<div class="g-row g-phase" '+pc+'><div class="g-left"><span class="g-name">'+esc(p.name)+'</span><span class="g-dt g-ow"></span><span class="g-dt g-pc">'+phasePct(ts)+'%</span><span class="g-dt">'+(ps?fmt(ps[0]):'')+'</span><span class="g-dt">'+(ps?fmt(ps[1]):'')+'</span></div><div class="g-track" style="width:'+tw+'px">';
    if(ts.length){var sp=span(ts);h+='<div class="g-span" style="left:'+(off(sp[0])*PX)+'px;width:'+((off(sp[1])-off(sp[0])+1)*PX)+'px"></div>'}
    h+='</div></div>';
    ts.forEach(function(k){var st=slug(status(k)),lt=late(k);
      var sub=[];if(k.note)sub.push(esc(k.note));if(lt)sub.push('<span class="late-t">atrasada</span>');
      h+='<div class="g-row" '+pc+'><div class="g-left"><button class="st st-'+st+'" data-cycle="'+k.id+'" aria-label="'+esc(k.name)+': '+k.pct+'% feito" title="'+k.pct+'% feito"></button><span class="g-name"><input class="gd gn" id="gn-'+k.id+'" data-id="'+k.id+'" data-f="name" value="'+esc(k.name)+'" aria-label="Nome da tarefa">'+(sub.length?'<small>'+sub.join(' · ')+'</small>':'')+'</span><span class="g-dt g-ow g-ed"><input class="gd go" id="go-'+k.id+'" data-id="'+k.id+'" data-f="owner" value="'+esc(k.owner)+'" placeholder="—" aria-label="Responsável por '+esc(k.name)+'"></span><span class="g-dt g-pc g-ed"><input class="gd gp" type="number" min="0" max="100" step="5" id="gp-'+k.id+'" data-id="'+k.id+'" data-f="pct" value="'+k.pct+'" aria-label="% feita de '+esc(k.name)+'"></span>'+dcell(k,'start',k.realStart,false)+dcell(k,'end',k.realEnd,k.realEnd&&d(k.realEnd)>d(k.end))+'</div>'+
         '<div class="g-track" style="width:'+tw+'px"><div class="bar'+(lt?' b-late':'')+'" style="left:'+(off(k.start)*PX)+'px;width:'+(ndays(k)*PX)+'px" title="'+esc(k.name)+' · planeado '+fmt(k.start)+' – '+fmt(k.end)+'"><i class="fill" style="width:'+k.pct+'%"></i><span class="bar-d"><b>'+k.pct+'%</b> '+fmt(k.start)+(k.start!==k.end?' – '+fmt(k.end):'')+'</span></div>';
      if(k.realStart){var rs=d(k.realStart),re=k.realEnd?d(k.realEnd):Math.max(TODAY,rs);if(re<rs)re=rs;
        h+='<div class="real'+(k.realEnd?'':' open')+'" style="left:'+(offT(rs)*PX)+'px;width:'+(((re-rs)/DAY+1)*PX)+'px" title="Real: '+fmt(k.realStart)+' – '+(k.realEnd?fmt(k.realEnd):'em curso')+'"></div>'}
      h+='</div></div>'});
    h+='<div class="g-row g-add" '+pc+'><div class="g-left"><button class="btn add" data-add="'+p.id+'" data-where="g">+ Tarefa na '+esc(p.name.split(' · ')[0])+'</button></div><div class="g-track" style="width:'+tw+'px"></div></div>';
  });
  var M=S.milestone;
  h+='<div class="g-row"><div class="g-left"><span class="g-name"><b>'+esc(M.name)+'</b><small>'+esc(M.note)+'</small></span><span class="g-dt g-ow"></span><span class="g-dt g-pc"></span><span class="g-dt">jan</span><span class="g-dt"><small>a decidir</small></span></div><div class="g-track" style="width:'+tw+'px"><div class="ms-band" style="left:'+(off(M.start)*PX)+'px;width:'+((off(M.end)-off(M.start)+1)*PX)+'px"><span>'+esc(M.name)+' · a decidir</span></div></div></div>';
  h+='</div></div></div></section>';
  // Sequence
  var bad=0,items='';
  S.deps.forEach(function(dp){var a=byId(dp.before),b=byId(dp.after);if(!a||!b)return;var ok=d(b.start)>d(a.end);if(!ok)bad++;
    items+='<li class="'+(ok?'':'bad')+'"><span class="ck">'+(ok?'✓':'!')+'</span><p>'+esc(a.name)+' → '+esc(b.name)+'<small>'+esc(dp.why)+(ok?'':' Datas sobrepostas: '+fmt(a.end)+' / '+fmt(b.start)+'.')+'</small></p></li>'});
  h+='<section class="sec"><div class="sec-head"><h2>Sequência</h2><span class="save">'+(bad?bad+' ponto'+(bad>1?'s':'')+' a rever':'Tudo pela ordem certa')+'</span></div><ul class="checks">'+items+'</ul></section>';
  // Planning
  h+='<section class="sec"><div class="sec-head"><h2>Planeamento</h2><span class="save" id="save">'+esc(saveMsg)+'</span></div>';
  h+='<p class="hint">As datas planeadas são uma estimativa. Ao passar de 0% é preenchido o início real com a data de hoje, e ao chegar a 100% a conclusão real; pode corrigir as duas.</p>';
  h+='<div class="plan"><table><thead><tr><th class="c-name">Tarefa</th><th>Responsável</th><th colspan="2" class="grp">Planeado</th><th colspan="2" class="grp">Real</th><th>% feita</th><th></th></tr>'+
     '<tr class="sub"><th></th><th></th><th>Início</th><th>Fim</th><th>Início</th><th>Conclusão</th><th></th><th></th></tr></thead><tbody>';
  S.phases.forEach(function(p){var pc='style="--pc:var('+p.color+')"';
    h+='<tr class="ph-row" '+pc+'><td colspan="8"><i></i>'+esc(p.name)+'</td></tr>';
    tasksOf(p.id).forEach(function(k){var lt=k.realEnd&&d(k.realEnd)>d(k.end);
      h+='<tr '+pc+'><td><input class="in" id="n-'+k.id+'" data-id="'+k.id+'" data-f="name" value="'+esc(k.name)+'" aria-label="Nome da tarefa"></td>'+
        '<td><input class="in" id="o-'+k.id+'" data-id="'+k.id+'" data-f="owner" value="'+esc(k.owner)+'" placeholder="Nome" aria-label="Responsável"></td>'+
        '<td><input class="in" type="date" id="s-'+k.id+'" data-id="'+k.id+'" data-f="start" value="'+k.start+'" aria-label="Início planeado"></td>'+
        '<td><input class="in" type="date" id="e-'+k.id+'" data-id="'+k.id+'" data-f="end" value="'+k.end+'" aria-label="Fim planeado"></td>'+
        '<td class="real-c"><input class="in" type="date" id="rs-'+k.id+'" data-id="'+k.id+'" data-f="realStart" value="'+k.realStart+'" aria-label="Início real"></td>'+
        '<td class="real-c"><input class="in'+(lt?' is-late':'')+'" type="date" id="re-'+k.id+'" data-id="'+k.id+'" data-f="realEnd" value="'+k.realEnd+'" aria-label="Conclusão real"></td>'+
        '<td><div class="pct"><input class="in" type="number" min="0" max="100" step="5" id="p-'+k.id+'" data-id="'+k.id+'" data-f="pct" value="'+k.pct+'" aria-label="Percentagem feita"><span>%</span><i style="--w:'+k.pct+'%"></i></div></td>'+
        '<td><button class="btn del'+(armed===k.id?' arm':'')+'" data-del="'+k.id+'">'+(armed===k.id?'Apagar?':'×')+'</button></td></tr>'});
    h+='<tr '+pc+'><td colspan="8"><button class="btn add" data-add="'+p.id+'" data-where="t">+ Tarefa na '+esc(p.name.split(' · ')[0])+'</button></td></tr>';
  });
  h+='</tbody></table></div></section>';
  app.innerHTML=h;
  if(focusAfter){var fe=document.getElementById(focusAfter);focusAfter=null;if(fe){fe.focus();try{fe.select()}catch(_){};fe.scrollIntoView({block:'center'})}}
}
function setSave(m){saveMsg=m;var el=document.getElementById('save');if(el)el.textContent=m}
function changed(){render();if(RO)return;setSave('Alterações por guardar…');clearTimeout(timer);timer=setTimeout(function(){setSave('A guardar…');window.PLANO.save(S).then(setSave,function(e){setSave(e.message)})},1500)}
window.PLANO.rerender=function(n){S=n;render()};
function setPct(k,v){var was=k.pct;k.pct=v;
  if(v>0&&was===0&&!k.realStart)k.realStart=iso(TODAY);
  if(v>=100&&!k.realEnd)k.realEnd=iso(Math.max(TODAY,k.realStart?d(k.realStart):TODAY));
  if(v<100&&was>=100)k.realEnd='';}
var app=document.getElementById('app');
app.addEventListener('click',function(e){
  var c=e.target.closest('[data-cycle]');
  if(c){var k=byId(c.dataset.cycle);setPct(k,k.pct>=100?0:k.pct>=50?100:50);if(k.pct===0){k.realStart='';k.realEnd=''}changed();return}
  var a=e.target.closest('[data-add]');
  if(a){var p=phase(a.dataset.add),st=p.start;var nid='t'+Date.now().toString(36);S.tasks.push({id:nid,phase:p.id,name:'Nova tarefa',owner:'',start:st,end:iso(d(st)+2*DAY),pct:0,realStart:'',realEnd:''});armed=null;focusAfter=(a.dataset.where==='g'?'gn-':'n-')+nid;changed();return}
  var x=e.target.closest('[data-del]');
  if(x){var id=x.dataset.del;if(armed===id){S.tasks=S.tasks.filter(function(t){return t.id!==id});S.deps=S.deps.filter(function(dp){return dp.before!==id&&dp.after!==id});armed=null;changed()}else{armed=id;render()}return}
  if(armed){armed=null;render()}
});
app.addEventListener('change',function(e){var el=e.target,id=el.dataset.id,f=el.dataset.f;if(!id||!f)return;var k=byId(id);if(!k)return;
  var v=el.value.trim();
  if(f==='owner'){k.owner=v;changed();return}
  if(f==='pct'){var n=Math.round(+v);if(v===''||isNaN(n)){render();return}setPct(k,Math.max(0,Math.min(100,n)));changed();return}
  if(f==='realStart'||f==='realEnd'){k[f]=v;if(k.realStart&&k.realEnd&&k.realEnd<k.realStart){if(f==='realStart')k.realEnd=v;else k.realStart=v}
    if(f==='realEnd'&&v&&k.pct<100)k.pct=100;changed();return}
  if(!v){render();return}
  k[f]=v;if(f==='start'&&k.end<k.start)k.end=k.start;if(f==='end'&&k.end<k.start)k.start=k.end;changed()});
render();
})();
