// 获取 "?" 绝对路径
let base1 = new URL("?",location).href
// 获取 "d" 绝对路径
let base2 = new URL("d",location).href
// 文本正则
let textreg = /\.(css|txt|htm|html|xml|java|properties|sql|js|md|json|conf|ini|vue|php|py|bat|gitignore|yml|go|sh|c|cpp|h|hpp|tsx|vtt|srt|ass|rs|lrc|strm)$/i
// 音乐正则
let audioreg = /\.(mp3|flac|ogg|m4a|wav|opus|wma)$/i
// 视频正则
let videoreg = /\.(mp4|mkv|avi|mov|rmvb|webm|flv|m3u8)$/i
// 图片正则
let pngreg = /\.(jpg|tiff|jpeg|png|gif|bmp|svg|ico|swf|webp|avif)$/i
// 字幕正则
let subtitleReg = /\.(srt|ass|vtt|xml)$/

function fsList(path,page,per_page){
    let b = getFiles(path)
    if(b){
        let start = (page - 1) * per_page // 没有分页时，默认请求 page=1 per_page=0
        let end = per_page ? Math.min(start + per_page, b.length) : b.length;
        if(path == "/") path = ""; // "/" + "/" 情况
        let c = {
            "code": 200,
            "message": "success",
            "data": {
                "content": [],
                "total": b.length,
                "readme": "",
                "header": "",
                "write": false,
            }
        }
        for(let i=start;i<end;i++){
            let [d,s,m] = b[i]
            let type = getFileType(d);
            if(isFolder(path + "/" + d)){
                type = 1
            }
            let content =  {
                "name": d,
                "size": s,
                "is_dir": type == 1,
                "modified": (m|0)*1000,
                "sign": "",
                "thumb": "",
                "type": type,
            }
            c.data.content.push(content);
        }
        return c
    }else{
        return {code:500,message:path + " is not a folder",data:null}
    }
}

function fsGet(path){
    let index = path.lastIndexOf('/')
    let d = path.slice(index + 1);
    let b = isFolder(path)
    if(b){
        return {
            "code": 200,
            "message": "success",
            "data": {
                "name": d || "root",
                "size": 0,
                "is_dir": true,
                "modified": 0,
                "sign": "",
                "thumb": "",
                "type": 0,
                "raw_url": "",
                "readme": "",
                "header": "",
                "related": null
            }
        }
    }else{
        let c,f = getFiles(path.slice(0, index))
        try{
            if(!f){throw Error("network error")}
            let size = -1 , m;
            let type = getFileType(d);
            for(let link of f){
                if(link[0] == d){
                    size = link[1];
                    m = link[2]
                    break;
                }
            }
            if(size < 0) {throw Error(d + " is not Found")}
            c = {
                "code": 200,
                "message": "success",
                "data": {
                    "name": d,
                    "size": size,
                    "is_dir": false,
                    "modified": (m|0)*1000,
                    "sign": "",
                    "thumb": "",
                    "type": type,
                    "raw_url": gateway(path),
                    "readme": "",
                    "header": "",
                    "related": null
                }
            }
            if(type == 2){
                let related = [];
                let t = d.replace(videoreg,"");
                for(let link of f){
                    let [d,s,m] = link
                    if(subtitleReg.test(d) && d.startsWith(t)){
                        let content = {
                            "name": d,
                            "size": s,
                            "is_dir": false,
                            "modified": (m|0)*1000,
                            "sign": "",
                            "thumb": "",
                            "type": 4
                        }
                        related.push(content);
                    }
                }
                c.data.related = related
            }
            return c
        }catch(e){
            return {code:500,message:e.message,data:null}
        }
    }
}

function fsDirs(path){
    let b = getFiles(path)
    if(b){
        if(path == "/") path = ""; // "/" + "/" 情况
        let c = {
            "code": 200,
            "message": "success",
            "data": []
        }
        for(let link of b){
            let d = link[0]
            let content =  {
                "name": d,
                "modified": (link[2]|0)*1000,
            }
            if(isFolder(path + "/" + d)){
                c.data.push(content);
            }
        }
        return c
    }else{
        return {code:500,message:path + " is not a folder",data:null}
    }      
}

function fsSearch(parent,keywords,scope,page,per_page){
    let c = {
        "code": 200,
        "message": "success",
        "data": {
            "content": [],
            "total": 0
        }
    }
    searchThing(parent,keywords,scope,page,per_page,c)
    return c
}

function getSearch(n){
    return new URL(location).searchParams.get(n) || "";
}

function generateUrl(path){
    // 将 /a/b/c 路径转为 ?path=/a/b/c 形式
    return base1 + "path=" + encodeURIComponent(path);
}

function hookXhref(r){
    // ?path=/a/b/c 获取 /a/b/c
    let path = new URL(r).searchParams.get("path")
    return path ? new URL(path,base1).href : r;
}

function gateway(path) {
    // 处理 % 和 # 的访问报错
    return base2 + path.replace(/%/g, "%25").replace(/#/g, "%23")
}

function generatePath(path){
    // 确保浏览器刷新后报错
    return encodeURIComponent(path.replace(/%/g,"%25"))
} 

history.replaceState1 = function(a,b,url){
    // 将 ?from_search=1&a=1 转为 ?path=...&from_search=1&a=1
    url = decodeURIComponent(url);
    let x = url.indexOf('?')  // xxx.com?a=1 => ?path=xxx.com&a=1
    if(~x){
        url = `?path=${generatePath(getSearch("path"))}&`+url.slice(x+1)
    }else{
        url = "?path="+generatePath(url)
    }
    return history.replaceState(a,b,url)
}

// 搜查，路径，跳转，分页会使用到 all、pagination、load_more、auto_load_more
history.pushState1 = function(a,b,url){
    // 将 ?from_search=1&a=1 转为 ?path=...&from_search=1&a=1
    url = decodeURIComponent(url);
    let x = url.indexOf('?')
    if(~x){ 
        url = `?path=${generatePath(url.slice(0,x))}&`+url.slice(x+1)
    }else{
        url = "?path="+generatePath(url)
    }
    return history.pushState(a,b,url)
}

Object.defineProperties(location,{
    pathname1:{
        get:function(){
            return getSearch("path") || "/";
        },
        set:function(){
            alert("can't hook")
        }
    },search1:{
        get:function(){
            // 删除 location.search 中的 path 参数
            let url = new URL(location.href);
            url.searchParams.delete("path");
            return url.search;
        },
        set:function(){
            alert("can't hook")
        }
    }
})

function isFolder(name){
    return name in pathCache;
}

function getFileType(d){
    // 未知 0、目录 1、视频 2、音乐 3、文本 4、图片 5 
    if(textreg.test(d)){
        return 4
    }else if(audioreg.test(d)){
        return 3
    }else if(videoreg.test(d)){
        return 2
    }else if(pngreg.test(d)){
        return 5
    }else{
        return 0
    }
}

function hookdownload(i,o,a){
    // i 是否进行 302 跳转，默认 200 无需考虑
    // o 是否文件直接链接
    // a 给定路径
    if(o){
        return gateway(decodeURIComponent(a))
    }else{
        return generateUrl(a);
    }
}

function hookurl(url,base){
    // 处理 fsDirs 的 # 报错
    return new URL(url.replace(/#/g, "%23"),base)
}

// https://github.com/farzher/fuzzysort v1.9.0 最大长度为 8192
let fuzzy=function(){function r(n){return e+n<f?t.subarray(e,e+=n):(e=0,t=new Uint16Array(f<<=1),r(n))}let e=0,f=65536,t=new Uint16Array(f);var n=new Map,i=new Map,a=r(8192),o=r(8192),u=function(e){for(var f=e.length,t=r(f),n=0;n<f;++n)t[n]=e.charCodeAt(n);for(e=0,f=t.length-1;0<=f;--f)e|=1<<(97<=(n=t[f])&&122>=n?n-97:48<=n&&57>=n?26:32===n?27:127>=n?28:29);return[t,e]},v=function(r,e){if(999<r.length)return u(r);var f=e.get(r);return void 0!==f||(f=u(r),e.set(r,f)),f};return function(e,f){if(!e||!f)return 0;e=e.toLowerCase();var t=f.toLowerCase();let[u,l]=v(e,n);if((l&(f=v(t,i))[1])!=l)e=0;else r:{var s=f,c=e,g=u[0],h=s[0];e=u.length,f=h.length;for(var b=0,w=0,d=0;;){if(g===h[w]){if(a[d++]=w,++b===e)break;g=u[b]}if(++w>=f){e=0;break r}}b=0,g=!1;var k=0,y=s[2];if(void 0===y){var A=y=h.length;w=[];for(var C=0,p=!1,z=0;z<A;++z){var L=h[z];L=97<=L&&122>=L||48<=L&&57>=L;var M=!p||!L;p=L,M&&(w[C++]=z)}for(A=r(y),C=w[0],z=p=0;z<y;++z)C>z?A[z]=C:(C=w[++p],A[z]=void 0===C?y:C);y=s[2]=A}if(s=0,(w=0===a[0]?0:y[a[0]-1])!==f)for(;;)if(w>=f){if(0>=b)break;if(200<++s)break;--b,w=y[o[--k]]}else if(u[b]===h[w]){if(o[k++]=w,++b===e){g=!0;break}++w}else w=y[w];if(c=t.indexOf(c,a[0]),(t=~c)&&!g)for(s=0;s<d;++s)a[s]=c+s;for(d=!1,t&&(d=y[c-1]==c),h=g?o:a,b=c=0,s=e-1;1<=s;--s)1!=h[s]-h[s-1]&&(c-=h[s],++b);if(c-=(h[e-1]-h[0]-(e-1))*b,0!==h[0]&&(c-=10*h[0]),g){for(g=1,s=y[0];s<f;s=y[s])++g;24<g&&(c*=10*(g-24))}else c*=1e3;t&&(c/=10),d&&(c/=10),e=c-(f-e)-1}return e}}(),pathCache={}

function getFiles(path) {
    return pathCache[path] 
}

function searchThing(path,searchName,searchType,page,per_page,c) {
    searchName = searchName.trim() // 去除搜查空格
    let allFiles = []
    let files = getFiles(path);
    let stack = [[files,path]]; // [[名字,大小,修改时间],[path]]
    function dfs(depth) {
        if (stack.length === 0 || depth === 20) {  // 最大搜寻深度为 20
            return;
        }
        let [fileLists,path] = stack.pop(), h; // h 为记录 score 得分
        if(path == "/") path = ""; 
        for (let i = 0; i < fileLists.length; i++) {
            let fileList = fileLists[i];
            let name = fileList[0]
            let aPath = path + "/" + name // 绝对路径
            let file = getFiles(aPath)
            if(file){
                // 为目录时
                if(searchType !== 2){  // 0 都搜寻、1 搜寻目录、2 搜寻文件 
                    h = fuzzy(searchName,name)
                    if (h){
                        allFiles.push([
                            path,
                            name,
                            h
                        ])
                    }
                }
                stack.push([file,aPath]);
                dfs(depth + 1);
            }else{
                // 为文件时
                if(searchType !== 1){ // 0 都搜寻、1 搜寻目录、2 搜寻文件 
                    h = fuzzy(searchName,name)
                    if(h){
                        allFiles.push([
                            path,
                            name,
                            h,
                            fileList[1]
                        ])
                    }
                }
            }
        }
    }
    dfs(0);
    c.data.total = allFiles.length
    c.data.content = allFiles.sort((a,b)=>b[2]-a[2]).slice((page-1)*per_page,page*per_page).map(c=>{
        let is_dir = isFolder(c[0]+ "/" +c[1])
        return {
            "parent": c[0],
            "name": c[1],
            "is_dir": is_dir,
            "size": is_dir?0:c[3],
            "type": is_dir?1:getFileType(c[1])
        }
    })
    // 排序是稳定的 , 得分越高 ，越相似
    return allFiles.sort((a,b)=>b[2]-a[2]);
}