export async function readImage(file:File):Promise<string>{
 if(!/^image\/(png|jpeg|webp|gif)$/.test(file.type))throw Error('请选择 PNG、JPEG、WebP 或 GIF 图片。');
 const url=URL.createObjectURL(file);try {const img=new Image();await new Promise<void>((resolve,reject)=>{img.onload=()=>resolve();img.onerror=()=>reject(Error('无法读取图片'));img.src=url;});const canvas=document.createElement('canvas'),scale=Math.min(1,1280/Math.max(img.width,img.height));canvas.width=Math.round(img.width*scale);canvas.height=Math.round(img.height*scale);canvas.getContext('2d')!.drawImage(img,0,0,canvas.width,canvas.height);return canvas.toDataURL('image/jpeg',0.84);}finally{URL.revokeObjectURL(url);}
}
