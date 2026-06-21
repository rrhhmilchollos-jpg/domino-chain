import { Link } from 'wouter';
import { ChevronLeft } from 'lucide-react';
import { useApi, useAuth, Av, FollowButton, Spinner, AppUser } from '../lib/shared';

export default function FollowListPage({ id, type }: { id: string; type: 'followers'|'following' }) {
  const { user: me } = useAuth();
  const { data: list, loading } = useApi(id ? `/api/users/${id}/${type}` : `/api/users/_/${type}`, [id, type]);
  const items: AppUser[] = Array.isArray(list) ? list : [];

  return (
    <div className="min-h-screen" style={{paddingTop:'80px',background:'#0b0b12'}}>
      <div className="max-w-lg mx-auto px-4 py-6">
        <div className="flex items-center gap-3 mb-5">
          <Link href={`/user/${id}`} className="p-1.5 rounded-full" style={{background:'#13131f'}}><ChevronLeft size={18} className="text-white"/></Link>
          <h1 className="text-lg font-black text-white" style={{fontFamily:'Syne,sans-serif'}}>{type==='followers'?'Seguidores':'Siguiendo'}</h1>
        </div>

        {loading?(
          <div className="text-center py-10"><Spinner/></div>
        ):items.length===0?(
          <div className="text-center py-16 px-4">
            <div className="text-4xl mb-2">{type==='followers'?'👥':'🔍'}</div>
            <p className="text-gray-400 text-sm">{type==='followers'?'Todavía nadie sigue a esta cuenta':'Esta cuenta todavía no sigue a nadie'}</p>
          </div>
        ):(
          <div className="space-y-1">
            {items.map(u=>(
              <div key={u._id} className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-white/5">
                <Link href={me&&u._id===me._id?'/dashboard':`/user/${u._id}`} className="flex items-center gap-3 flex-1 min-w-0">
                  <Av u={u} s={44}/>
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-white truncate">@{u.username}</p>
                    {(u.city||u.country)&&<p className="text-xs text-gray-500 truncate">{u.flag} {u.city}{u.city&&u.country?', ':''}{u.country}</p>}
                  </div>
                </Link>
                {(!me||u._id!==me._id)&&<FollowButton userId={u._id} initialIsFollowing={!!u.isFollowing} compact/>}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
