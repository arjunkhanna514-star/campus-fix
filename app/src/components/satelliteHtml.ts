// A small self-contained page that shows Esri satellite photos with Leaflet.
// The installed Android app shows it inside a WebView, so satellite works
// without a Google Maps key. The app sends it the blocks, route and position;
// the page sends back which block was tapped.

export type SatBlock = { id: string; name: string; lat: number; lng: number };

export function satelliteHtml(blocks: SatBlock[], centre: { lat: number; lng: number }) {
  return `<!doctype html><html><head>
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no">
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css">
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<style>
html,body,#map{margin:0;height:100%;background:#0a0a0b}
.cf-pill{display:inline-flex;align-items:center;gap:6px;transform:translate(-50%,-50%);white-space:nowrap;background:rgba(10,10,11,.82);color:#fff;border:1.5px solid rgba(255,255,255,.55);border-radius:999px;padding:3px 9px;font:700 13px/1.2 system-ui,sans-serif;box-shadow:0 4px 14px rgba(0,0,0,.45)}
.cf-pill.sel{background:#fff;color:#0a0a0b;border-color:#fff}
.cf-pill span{font-weight:500;font-size:12px}
.cf-me{width:18px;height:18px;border-radius:50%;background:#8AB4FF;border:3px solid #fff;box-shadow:0 0 0 6px rgba(138,180,255,.3)}
.leaflet-control-attribution{font-size:10px;background:rgba(0,0,0,.55)!important;color:#ccc!important}
.leaflet-control-attribution a{color:#ddd!important}
.msg{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;color:#bbb;font:15px system-ui,sans-serif;text-align:center;padding:24px}
</style></head><body><div id="map"></div>
<script>
var BLOCKS=${JSON.stringify(blocks)};
var post=function(m){window.ReactNativeWebView&&window.ReactNativeWebView.postMessage(JSON.stringify(m));};
if(!window.L){document.body.innerHTML='<div class="msg">Satellite view needs internet. Check the connection and try again.</div>';}
else{
var map=L.map('map',{zoomControl:false,minZoom:15,maxZoom:21}).setView([${centre.lat},${centre.lng}],17);
L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',{maxNativeZoom:19,maxZoom:21,attribution:'Imagery &copy; Esri, Maxar, Earthstar Geographics'}).addTo(map);
var group=L.layerGroup().addTo(map),line=null,me=null,selected=null,pad={top:150,bottom:200};
function drawBlocks(){group.clearLayers();BLOCKS.forEach(function(b){var s=b.id===selected;var html='<div class="cf-pill'+(s?' sel':'')+'">'+b.id+(s?'<span>'+b.name+'</span>':'')+'</div>';L.marker([b.lat,b.lng],{icon:L.divIcon({html:html,className:'',iconSize:[0,0]}),zIndexOffset:s?1000:0}).on('click',function(){post({type:'select',id:b.id});}).addTo(group);});}
drawBlocks();
window.campusFix={
 select:function(id){selected=id;drawBlocks();var b=BLOCKS.filter(function(x){return x.id===id;})[0];if(b&&!line)map.flyTo([b.lat,b.lng],19,{duration:.6});},
 route:function(points,bottom){pad.bottom=bottom||200;if(line){line.remove();line=null;}if(points&&points.length>1){line=L.polyline(points,{color:'#fff',weight:6,lineCap:'round',lineJoin:'round'}).addTo(map);map.fitBounds(line.getBounds(),{paddingTopLeft:[40,pad.top],paddingBottomRight:[40,pad.bottom+40]});}},
 me:function(lat,lng,follow){if(!me)me=L.marker([lat,lng],{icon:L.divIcon({html:'<div class="cf-me"></div>',className:'',iconSize:[18,18],iconAnchor:[9,9]}),interactive:false,zIndexOffset:2000}).addTo(map);else me.setLatLng([lat,lng]);if(follow)map.panTo([lat,lng]);}
};
post({type:'ready'});
}
</script></body></html>`;
}
