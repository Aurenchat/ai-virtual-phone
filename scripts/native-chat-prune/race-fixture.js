
const trap = new Proxy({}, {get:(_target,key)=>()=>{throw Error('Unexpected media dependency '+String(key))}});
for(const name of ['./data-management/modules','./data-management/serializers','./idb-open','./media-cache-storage','./music-storage','./moments-db','./moments-storage','./theme-storage','./xiaohongshu-storage']) fake[name]=trap;


const seedOriginal=window.seed;window.seed=async(...args)=>{try{return await seedOriginal(...args)}catch(e){throw new Error(e.name+": "+e.message+" "+e.stack)}};
