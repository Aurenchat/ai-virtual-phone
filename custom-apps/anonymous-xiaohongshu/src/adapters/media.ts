// CUSTOM-APP-ADAPTER: original image compression/rendering remains in the copied UI.
import {host} from './host';
import {put} from './storage';
let avatarUrls:string[]=[];
export async function initializeMedia(){avatarUrls=await Promise.all(Array.from({length:6},(_,i)=>host().app.getAssetUrl(`assets/avatars/default-0${i+1}.png`)));}
export function defaultAvatars(){return avatarUrls;}
export async function saveChatImageToIndexedDB(blob:Blob){const id='image_'+crypto.randomUUID();const dataUrl=await new Promise<string>((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(String(r.result));r.onerror=()=>reject(r.error);r.readAsDataURL(blob);});await put('post_images',id,{dataUrl});return id;}
export async function getChatImageFromIndexedDB(id:string):Promise<string|null>{if(id.startsWith('data:'))return id;return (await host().db.get('post_images',id))?.dataUrl||null;}
