"use client";
import { useEffect, useState } from "react";
import { useInfiniteQuery, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase, isReiDemonio, getRankFromXp } from "@gitquest/database";
import { 
  addPlayerToGuild, completeSuggestionAction, createGuildAction, editGuildAction,
  fetchGuildsData, fetchOrganogramData, fetchProfilesPage, fetchSuggestionsPage,
  removePlayerFromGuild,
} from "../src/lib/actions";
import OrganogramModal from "../src/components/OrganogramModal";
// Tipagens atualizadas
interface Guild { id: string; name: string; icon_url: string; department: string; }
interface GuildMembership { guild_id: string; guilds?: { name: string } | null; }
interface Profile { id: string; github_username: string; total_xp: number; guild_members?: GuildMembership[]; avatar_url?: string; class_type?: string; rank_tier?: string; tech_stack?: string[];}
interface OrganogramProfile { id: string; github_username: string; avatar_url?: string; }
interface OrganogramMembership { guild_id: string; user_id: string; }
interface OrganogramData { profiles: OrganogramProfile[]; guildMembers: OrganogramMembership[]; }
interface Suggestion { id: string; user_id: string; title: string; content: string; status: string; profiles?: { github_username: string; avatar_url?: string; }; }

export default function AdminPanel() {
  const queryClient = useQueryClient();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  
  // Modais de Guilda
  const [isCreateGuildModalOpen, setIsCreateGuildModalOpen] = useState(false);
  const [isEditGuildModalOpen, setIsEditGuildModalOpen] = useState(false);
  const [guildToEdit, setGuildToEdit] = useState<Guild | null>(null);
  const [isGuildTreeModalOpen, setIsGuildTreeModalOpen] = useState(false);
  const [selectedGuild, setSelectedGuild] = useState<Guild | null>(null);
  
  // Modal de Move
  const [isMovePlayerModalOpen, setIsMovePlayerModalOpen] = useState(false);
  const [playerToMove, setPlayerToMove] = useState<Profile | null>(null);

  // Estados dos Filtros
  const [explorerSearch, setExplorerSearch] = useState("");
  const [explorerGuildFilter, setExplorerGuildFilter] = useState("all");
  const [explorerRankFilter, setExplorerRankFilter] = useState("all");
  const [suggestionStatusFilter, setSuggestionStatusFilter] = useState("all"); // 'all' | 'pending' | 'completed'

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setIsAdmin(user && isReiDemonio(user.id) ? true : false);
    });
  }, []);

  const { data: guilds = [] } = useQuery({
    queryKey: ['guilds'],
    queryFn: fetchGuildsData,
    enabled: isAdmin === true,
  });

  const { data: organogramData } = useQuery({
    queryKey: ["organogram"],
    queryFn: fetchOrganogramData,
    enabled: isAdmin === true && isGuildTreeModalOpen,
  });

  // React Query: Profiles (Agora reage aos filtros)
  const { data: profilesData, fetchNextPage: fetchNextProfiles, hasNextPage: hasNextProfiles } = useInfiniteQuery({
    queryKey: ['profiles', explorerSearch, explorerGuildFilter, explorerRankFilter],
    queryFn: ({ pageParam = 0 }) => fetchProfilesPage(pageParam, 10, { search: explorerSearch, guildId: explorerGuildFilter, rank: explorerRankFilter }),
    getNextPageParam: (lastPage, allPages) => lastPage.length === 10 ? allPages.length : undefined,
    initialPageParam: 0,
    enabled: isAdmin === true,
  });

  // React Query: Suggestions (Reage ao filtro de status)
  const { data: suggestionsData, fetchNextPage: fetchNextSuggestions, hasNextPage: hasNextSuggestions } = useInfiniteQuery({
    queryKey: ['suggestions', suggestionStatusFilter],
    queryFn: ({ pageParam = 0 }) => fetchSuggestionsPage(pageParam, 10, suggestionStatusFilter),
    getNextPageParam: (lastPage, allPages) => lastPage.length === 10 ? allPages.length : undefined,
    initialPageParam: 0,
    enabled: isAdmin === true,
  });

  const profiles = (profilesData?.pages.flat() as Profile[]) || [];
  const suggestions = (suggestionsData?.pages.flat() as Suggestion[]) || [];
  const organogram = (organogramData as OrganogramData | undefined) || { profiles: [], guildMembers: [] };

  const handleScroll = (e: React.UIEvent<HTMLDivElement>, fetchNext: () => void, hasNext: boolean) => {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
    if (scrollHeight - scrollTop <= clientHeight + 50 && hasNext) fetchNext();
  };

  const handleGuildCreation = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    await createGuildAction(new FormData(e.currentTarget));
    setIsCreateGuildModalOpen(false);
    queryClient.invalidateQueries({ queryKey: ['guilds'] });
  };

  const handleGuildEdit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!guildToEdit) return;
    await editGuildAction(guildToEdit.id, new FormData(e.currentTarget));
    setIsEditGuildModalOpen(false);
    setGuildToEdit(null);
    queryClient.invalidateQueries({ queryKey: ['guilds'] });
    // Atualiza a guilda selecionada na árvore caso seja a mesma
    if (selectedGuild?.id === guildToEdit.id) {
       setSelectedGuild(prev => prev ? { ...prev, name: (new FormData(e.currentTarget)).get("name") as string, icon_url: (new FormData(e.currentTarget)).get("iconUrl") as string } : null);
    }
  };

  const invalidateGuildMemberships = () => {
    queryClient.invalidateQueries({ queryKey: ["profiles"] });
    queryClient.invalidateQueries({ queryKey: ["organogram"] });
  };

  const handleAddPlayerToGuild = async (guildId: string) => {
    if (!playerToMove) return;
    await addPlayerToGuild(playerToMove.id, guildId);
    setPlayerToMove((current) => current ? {
      ...current,
      guild_members: [...(current.guild_members || []), { guild_id: guildId }],
    } : null);
    invalidateGuildMemberships();
  };

  const handleRemovePlayerFromGuild = async (guildId: string) => {
    if (!playerToMove) return;
    await removePlayerFromGuild(playerToMove.id, guildId);
    setPlayerToMove((current) => current ? {
      ...current,
      guild_members: (current.guild_members || []).filter((member) => member.guild_id !== guildId),
    } : null);
    invalidateGuildMemberships();
  };

  const handleCompleteSuggestion = async (suggestionId: string, userId: string) => {
    await completeSuggestionAction(suggestionId, userId);
    queryClient.invalidateQueries({ queryKey: ['suggestions'] });
    queryClient.invalidateQueries({ queryKey: ['profiles'] });
  };

  if (isAdmin === null) return <div className="flex h-screen items-center justify-center bg-slate-900 text-amber-500 font-bold text-2xl animate-pulse">Despertando o Trono...</div>;
  if (!isAdmin) return <div className="flex h-screen items-center justify-center bg-slate-100"><h1 className="text-5xl font-black text-slate-800 mb-2">Acesso Negado</h1></div>;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-8 font-sans text-slate-800">
      
      {/* HEADER */}
      <header className="flex justify-between items-center mb-10 bg-white p-6 rounded-2xl shadow-sm border border-slate-200 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-amber-300 opacity-10 rounded-full blur-3xl transform translate-x-1/2 -translate-y-1/2"></div>
        <div className="relative z-10 flex items-center gap-4">
          <div className="w-16 h-16 bg-gradient-to-tr from-amber-400 to-orange-500 rounded-2xl flex items-center justify-center shadow-lg text-white text-3xl">👑</div>
          <div>
            <h1 className="text-4xl font-extrabold text-slate-800 tracking-tight">O Grande Salão</h1>
            <p className="text-amber-600 font-medium mt-1">Domínio do Rei Demônio</p>
          </div>
        </div>
        <button onClick={() => setIsCreateGuildModalOpen(true)} className="relative z-10 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-500 hover:to-orange-500 text-white font-bold py-3 px-8 rounded-xl shadow-lg transition-all transform hover:-translate-y-1 flex items-center gap-2">
          <span>🛡️</span> Fundar Guilda
        </button>
      </header>

      {/* DASHBOARD CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col justify-center relative overflow-hidden group">
          <div className="absolute right-[-20px] top-[-20px] text-8xl opacity-5">⚔️</div>
          <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider">Heróis Retornados</h3>
          <p className="text-5xl font-black text-slate-700 mt-2">{profiles.length}</p>
        </div>
        <div onClick={() => { setIsGuildTreeModalOpen(true); setSelectedGuild(null); }} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 hover:border-amber-400 cursor-pointer transition-all relative overflow-hidden group">
          <div className="absolute right-[-20px] top-[-20px] text-8xl opacity-5 group-hover:scale-110 transition-transform">🏰</div>
          <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider group-hover:text-amber-500 transition-colors">Guildas Ativas</h3>
          <p className="text-5xl font-black text-slate-700 mt-2">{guilds.length}</p>
          <span className="text-xs font-bold text-amber-500 bg-amber-50 px-2 py-1 rounded mt-2 inline-block">Ver Árvore Genealógica →</span>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col justify-center relative overflow-hidden group">
          <div className="absolute right-[-20px] top-[-20px] text-8xl opacity-5">📜</div>
          <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider">Missões Exibidas</h3>
          <p className="text-5xl font-black text-orange-500 mt-2">{suggestions.length}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* LISTAGEM DE HERÓIS */}
        <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden flex flex-col">
          <div className="p-6 border-b border-slate-50">
            <h2 className="text-xl font-extrabold text-slate-800 flex items-center gap-2 mb-4"><span>✨</span> Exploradores</h2>
            
            {/* BARRA DE FILTROS - EXPLORADORES */}
            <div className="flex flex-wrap gap-2">
              <input 
                type="text" 
                placeholder="Buscar por nome..." 
                value={explorerSearch}
                onChange={(e) => setExplorerSearch(e.target.value)}
                className="flex-1 min-w-[150px] p-2 text-sm bg-slate-50 border border-slate-200 rounded-lg outline-none focus:border-amber-400"
              />
              <select 
                value={explorerGuildFilter} 
                onChange={(e) => setExplorerGuildFilter(e.target.value)}
                className="p-2 text-sm bg-slate-50 border border-slate-200 rounded-lg outline-none focus:border-amber-400 font-medium text-slate-600 cursor-pointer"
              >
                <option value="all">Todas Guildas</option>
                <option value="none">🐺 Lobo Solitário</option>
                {guilds.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
              </select>
              <select 
                value={explorerRankFilter} 
                onChange={(e) => setExplorerRankFilter(e.target.value)}
                className="p-2 text-sm bg-slate-50 border border-slate-200 rounded-lg outline-none focus:border-amber-400 font-medium text-slate-600 cursor-pointer"
              >
                <option value="all">Patentes</option>
                <option value="BRONZE">Bronze</option>
                <option value="PRATA">Prata</option>
                <option value="OURO">Ouro</option>
                <option value="PLATINA">Platina</option>
                <option value="DIAMANTE">Diamante</option>
              </select>
            </div>
          </div>

        <div className="flex-1 overflow-auto max-h-[500px] p-4 scroll-smooth" onScroll={(e) => handleScroll(e, fetchNextProfiles, hasNextProfiles)}>
            {profiles.length === 0 ? (
               <div className="text-center py-10 text-slate-400 italic">Nenhum herói encontrado com estes filtros.</div>
            ) : (
              <div className="flex flex-col gap-3">
                {profiles.map(profile => (
                  <div key={profile.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100 hover:border-amber-200 transition-colors">
                    <div className="flex items-center gap-4">
                      <img src={profile.avatar_url || `https://api.dicebear.com/7.x/adventurer/svg?seed=${profile.github_username}`} alt="Avatar" className="w-12 h-12 rounded-full border-2 border-white shadow-sm bg-slate-200" />
                      <div>
                        <h4 className="font-bold text-slate-800 flex items-center gap-2">
                          {profile.github_username}
                          <span className="text-[10px] bg-slate-200 text-slate-600 px-2 py-0.5 rounded font-black">{profile.class_type || 'NOVICE'}</span>
                        </h4>
                        
                        {/* INÍCIO DO BLOCO DAS SKILLS (TECH STACK) */}
                        {profile.tech_stack && profile.tech_stack.length > 0 && (
                          <div className="flex gap-1 mt-1.5 mb-1">
                            {profile.tech_stack.map(tech => (
                              <span key={tech} className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-slate-200 border border-slate-300 text-slate-600 uppercase tracking-wider">
                                {tech}
                              </span>
                            ))}
                          </div>
                        )}
                        {/* FIM DO BLOCO DAS SKILLS */}

                        <div className="flex items-center gap-2 mt-1">
                          <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-amber-100 text-amber-700">
                            {getRankFromXp(profile.total_xp || 0)}
                          </span>
                          <span className="text-xs font-bold text-slate-500">{profile.total_xp} XP</span>
                          <span className="text-xs font-medium text-slate-400 border-l border-slate-300 pl-2">
                            {profile.guild_members?.length
                              ? `🛡️ ${profile.guild_members.map((member) => member.guilds?.name).filter(Boolean).join(", ")}`
                              : "Lobo Solitário"}
                          </span>
                        </div>
                      </div>
                    </div>
                    <button onClick={() => { setPlayerToMove(profile); setIsMovePlayerModalOpen(true); }} className="w-10 h-10 rounded-full bg-white border border-slate-200 flex items-center justify-center hover:bg-amber-50 hover:border-amber-300 hover:text-amber-600 transition-colors shadow-sm">🔄</button>
                  </div>
                ))}
                {hasNextProfiles && <div className="text-center text-sm text-amber-500 py-2 animate-pulse">Invocando mortais...</div>}
              </div>
            )}
          </div>
        </div>

        {/* LISTAGEM DE SUGESTÕES */}
        <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden flex flex-col">
          <div className="p-6 border-b border-slate-50 flex justify-between items-center">
            <h2 className="text-xl font-extrabold text-slate-800 flex items-center gap-2"><span>💌</span> Caixa de Sugestões</h2>
            
            {/* ABAS DE FILTRO - SUGESTÕES */}
            <div className="flex bg-slate-100 rounded-lg p-1">
              <button onClick={() => setSuggestionStatusFilter('all')} className={`px-3 py-1 text-xs font-bold rounded-md transition-colors ${suggestionStatusFilter === 'all' ? 'bg-white shadow-sm text-slate-800' : 'text-slate-500 hover:text-slate-700'}`}>Todas</button>
              <button onClick={() => setSuggestionStatusFilter('pending')} className={`px-3 py-1 text-xs font-bold rounded-md transition-colors ${suggestionStatusFilter === 'pending' ? 'bg-white shadow-sm text-amber-600' : 'text-slate-500 hover:text-slate-700'}`}>Pendentes</button>
              <button onClick={() => setSuggestionStatusFilter('completed')} className={`px-3 py-1 text-xs font-bold rounded-md transition-colors ${suggestionStatusFilter === 'completed' ? 'bg-white shadow-sm text-green-600' : 'text-slate-500 hover:text-slate-700'}`}>Concluídas</button>
            </div>
          </div>
          
          <div className="flex-1 overflow-auto max-h-[500px] p-4 scroll-smooth" onScroll={(e) => handleScroll(e, fetchNextSuggestions, hasNextSuggestions)}>
            {suggestions.length === 0 ? (
              <div className="text-center py-10 text-slate-400 italic">O quadro de avisos está vazio.</div>
            ) : (
              <div className="flex flex-col gap-4">
                {suggestions.map(sug => {
                  const isPending = sug.status?.toLowerCase() === 'pending' || sug.status?.toLowerCase() === 'pendente';
                  
                  return (
                    <div key={sug.id} className="p-5 border border-slate-100 rounded-2xl bg-white shadow-sm hover:shadow-md transition-shadow relative overflow-hidden flex flex-col">
                      <div className={`absolute top-0 left-0 w-1.5 h-full ${isPending ? 'bg-amber-400' : 'bg-green-400'}`}></div>
                      <div className="flex justify-between items-start mb-2 pl-3">
                        <div>
                          <h4 className="font-bold text-slate-800 text-lg leading-tight">{sug.title}</h4>
                          <div className="flex items-center gap-2 mt-2">
                            <img src={sug.profiles?.avatar_url || `https://api.dicebear.com/7.x/adventurer/svg?seed=${sug.profiles?.github_username}`} alt="Avatar" className="w-6 h-6 rounded-full border border-slate-200 bg-slate-50" />
                            <p className="text-xs font-semibold text-slate-500">{sug.profiles?.github_username}</p>
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-2">
                          <span className={`text-[10px] px-2 py-1 rounded font-black uppercase tracking-wider ${isPending ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700'}`}>
                            {isPending ? 'Pendente' : 'Concluída'}
                          </span>
                          {isPending && (
                            <button onClick={() => handleCompleteSuggestion(sug.id, sug.user_id)} className="w-8 h-8 bg-slate-50 border border-slate-200 hover:border-green-400 hover:bg-green-50 hover:text-green-600 rounded-full flex items-center justify-center transition-colors shadow-sm cursor-pointer" title="Aprovar e Recompensar">
                              ✅
                            </button>
                          )}
                        </div>
                      </div>
                      <div className="mt-2 pl-3 pt-3 border-t border-slate-50">
                        <p className="text-sm text-slate-600 line-clamp-2">{sug.content}</p>
                      </div>
                    </div>
                  );
                })}
                {hasNextSuggestions && <div className="text-center text-sm text-amber-500 py-2 animate-pulse">Lendo pergaminhos...</div>}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* MODAL: CRIAR GUILDA */}
      {isCreateGuildModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden transform transition-all scale-100">
            <div className="p-6 border-b border-slate-50 flex justify-between items-center bg-slate-50/50">
              <h2 className="text-2xl font-black text-slate-800 flex items-center gap-2"><span>🛡️</span> Fundar Guilda</h2>
              <button onClick={() => setIsCreateGuildModalOpen(false)} className="w-8 h-8 rounded-full bg-slate-200 hover:bg-red-100 hover:text-red-600 flex items-center justify-center font-bold">&times;</button>
            </div>
            <form onSubmit={handleGuildCreation} className="p-8 flex flex-col gap-5">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Nome da Guilda</label>
                <input name="name" className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-amber-400 outline-none" required />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">
                  Departamento
                </label>

                <select
                  name="department"
                  defaultValue=""
                  required
                  className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-amber-400 outline-none"
                >
                  <option value="" disabled>
                    Selecione um departamento
                  </option>

                  <option value="SEAP">🛡️ SEAP</option>
                  <option value="PHP">🐘 PHP</option>
                  <option value="JAVA">☕ JAVA</option>
                  <option value="GLOBAL">🌍 GLOBAL</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">URL do Brasão (Opcional)</label>
                <input name="iconUrl" className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-amber-400 outline-none" />
              </div>
              <button type="submit" className="w-full bg-slate-800 hover:bg-slate-900 text-white font-bold py-4 rounded-xl mt-2 transition-colors shadow-lg">Erguer Estandarte</button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: EDITAR GUILDA */}
      {isEditGuildModalOpen && guildToEdit && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-[60] p-4 animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden">
            <div className="p-6 border-b border-slate-50 flex justify-between items-center bg-slate-50/50">
              <h2 className="text-2xl font-black text-slate-800 flex items-center gap-2"><span>✏️</span> Editar Guilda</h2>
              <button onClick={() => { setIsEditGuildModalOpen(false); setGuildToEdit(null); }} className="w-8 h-8 rounded-full bg-slate-200 hover:bg-red-100 hover:text-red-600 flex items-center justify-center font-bold">&times;</button>
            </div>
            <form onSubmit={handleGuildEdit} className="p-8 flex flex-col gap-5">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Novo Nome</label>
                <input name="name" defaultValue={guildToEdit.name} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-amber-400 outline-none" required />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">
                  Departamento
                </label>

                <select
                  name="department"
                  defaultValue={guildToEdit.department}
                  required
                  className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-amber-400 outline-none"
                >
                  <option value="SEAP">🛡️ SEAP</option>
                  <option value="PHP">🐘 PHP</option>
                  <option value="JAVA">☕ JAVA</option>
                  <option value="GLOBAL">🌍 GLOBAL</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Nova URL do Brasão</label>
                <input name="iconUrl" defaultValue={guildToEdit.icon_url} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-amber-400 outline-none" />
              </div>
              <button type="submit" className="w-full bg-amber-500 hover:bg-amber-600 text-white font-bold py-4 rounded-xl mt-2 transition-colors shadow-lg">Salvar Modificações</button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: MOVER PLAYER */}
      {isMovePlayerModalOpen && playerToMove && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in">
          <div className="bg-white w-full max-w-sm rounded-3xl shadow-2xl p-6">
            <h2 className="text-xl font-black mb-1 text-center text-slate-800">Gerenciar Guildas</h2>
            <p className="text-center text-sm text-slate-500 mb-6">Guildas de <span className="font-bold text-amber-600">{playerToMove.github_username}</span></p>
            <div className="flex flex-col gap-2 max-h-[300px] overflow-y-auto pr-2">
              {guilds.map((guild) => {
                const isMember = playerToMove.guild_members?.some((member) => member.guild_id === guild.id) ?? false;
                return (
                  <button
                    key={guild.id}
                    onClick={() => isMember ? handleRemovePlayerFromGuild(guild.id) : handleAddPlayerToGuild(guild.id)}
                    className={`p-4 border rounded-xl font-bold text-left transition-colors flex items-center justify-between gap-3 ${isMember ? "border-red-100 bg-red-50 text-red-600 hover:bg-red-100" : "border-slate-100 hover:border-amber-300 hover:bg-amber-50 text-slate-700"}`}
                  >
                    <span className="flex items-center gap-3">
                      {guild.icon_url ? <img src={guild.icon_url} alt="" className="w-6 h-6 rounded" /> : <span className="w-6 h-6 rounded bg-amber-100 flex items-center justify-center text-xs">🛡️</span>}
                      {guild.name}
                    </span>
                    <span>{isMember ? "Remover" : "Adicionar"}</span>
                  </button>
                );
              })}
            </div>
            <button onClick={() => setIsMovePlayerModalOpen(false)} className="mt-4 w-full p-3 font-bold text-slate-400 hover:bg-slate-50 rounded-xl">Cancelar</button>
          </div>
        </div>
      )}

      {/* MODAL: ÁRVORE DE GUILDAS COM BOTÃO EDITAR */}
      {isGuildTreeModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in">
          <div className="bg-white w-full max-w-4xl rounded-3xl shadow-2xl flex flex-col max-h-[85vh] overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex justify-between bg-slate-50">
              <h2 className="text-2xl font-black text-slate-800 flex items-center gap-2">
                {selectedGuild ? (
                  <>
                    {selectedGuild.icon_url ? <img src={selectedGuild.icon_url} alt="" className="w-8 h-8 rounded" /> : <span className="w-8 h-8 rounded bg-amber-100 flex items-center justify-center text-sm">🛡️</span>}
                    {selectedGuild.name}
                  </>
                ) : ('🏰 Grimório de Guildas')}
              </h2>
              <button onClick={() => setIsGuildTreeModalOpen(false)} className="w-8 h-8 rounded-full bg-slate-200 hover:bg-red-100 hover:text-red-600 flex items-center justify-center font-bold">&times;</button>
            </div>
            <OrganogramModal
                open={isGuildTreeModalOpen}
                onClose={() => setIsGuildTreeModalOpen(false)}
                guilds={guilds}
                profiles={organogram.profiles}
                guildMembers={organogram.guildMembers}
                onAddPlayer={async (playerId, guildId) => {
                    await addPlayerToGuild(playerId, guildId);
                    invalidateGuildMemberships();
                }}
                onRemovePlayer={async (playerId, guildId) => {
                    await removePlayerFromGuild(playerId, guildId);
                    invalidateGuildMemberships();
                }}
                onEditGuild={(guild) => {
                    setGuildToEdit(guild as Guild);
                    setIsEditGuildModalOpen(true);
                }}
            />
          </div>
        </div>
      )}

    </div>
  );
}
