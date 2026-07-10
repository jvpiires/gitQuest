"use server";
import { getSupabaseAdmin } from "@gitquest/database"; // Ajuste o caminho se necessário

// Busca dados ignorando RLS (Poder de Admin)
export async function fetchAdminDashboardData() {
  const admin = getSupabaseAdmin(process.env.SUPABASE_SERVICE_ROLE_KEY!);
  
  const { data: profiles } = await admin.from('profiles').select('*, guild_members(guild_id, guilds(name))');
  const { data: guilds } = await admin.from('guilds').select('*');
  const { data: suggestions } = await admin.from('suggestions').select('*, profiles(github_username)');

  return { 
    profiles: profiles || [], 
    guilds: guilds || [], 
    suggestions: suggestions || [] 
  };
}

export async function createGuildAction(formData: FormData) {
  const name = formData.get("name") as string;
  const department = formData.get("department") as string;
  const iconUrl = formData.get("iconUrl") as string;
  const validDepartments = ["SEAP", "PHP", "JAVA", "GLOBAL"];

  if (!validDepartments.includes(department)) {
    throw new Error("Selecione um departamento válido.");
  }
  
  const finalIconUrl = iconUrl || `https://api.dicebear.com/7.x/shapes/svg?seed=${name}&backgroundColor=cbd5e1`;
  const admin = getSupabaseAdmin(process.env.SUPABASE_SERVICE_ROLE_KEY!);
  
  const { error } = await admin.from("guilds").insert([{ name, department, icon_url: finalIconUrl, github_org_or_repo: 'N/A' }]);
  if (error) throw new Error(error.message);
  return { success: true };
}

export async function addPlayerToGuild(userId: string, guildId: string) {
  const supabaseAdmin = getSupabaseAdmin(process.env.SUPABASE_SERVICE_ROLE_KEY!);
  const { error } = await supabaseAdmin
    .from("guild_members")
    .upsert({ user_id: userId, guild_id: guildId }, { onConflict: "user_id,guild_id" });
  if (error) throw new Error(error.message);
  return { success: true };
}

export async function removePlayerFromGuild(userId: string, guildId: string) {
  const supabaseAdmin = getSupabaseAdmin(process.env.SUPABASE_SERVICE_ROLE_KEY!);
  const { error } = await supabaseAdmin
    .from("guild_members")
    .delete()
    .eq("user_id", userId)
    .eq("guild_id", guildId);
  if (error) throw new Error(error.message);
  return { success: true };
}

export async function fetchOrganogramData() {
  const admin = getSupabaseAdmin(process.env.SUPABASE_SERVICE_ROLE_KEY!);
  const [{ data: profiles, error: profilesError }, { data: guildMembers, error: membersError }] = await Promise.all([
    admin.from("profiles").select("id, github_username, avatar_url").order("github_username"),
    admin.from("guild_members").select("guild_id, user_id"),
  ]);

  if (profilesError) throw new Error(profilesError.message);
  if (membersError) throw new Error(membersError.message);

  return { profiles: profiles || [], guildMembers: guildMembers || [] };
}

export async function completeSuggestionAction(suggestionId: string, authorId: string) {
  const supabaseAdmin = getSupabaseAdmin(process.env.SUPABASE_SERVICE_ROLE_KEY!);
  const XP_REWARD = 500; // A generosidade do Rei

  try {
    await supabaseAdmin
      .from("suggestions")
      .update({ status: 'completed' })
      .eq("id", suggestionId);

    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("total_xp")
      .eq("id", authorId)
      .single();

    const newXp = (profile?.total_xp || 0) + XP_REWARD;

    await supabaseAdmin
      .from("profiles")
      .update({ total_xp: newXp })
      .eq("id", authorId);

    await supabaseAdmin
      .from("quest_logs")
      .insert([{
        user_id: authorId,
        action_type: 'SUGGESTION_ACCEPTED',
        xp_gained: XP_REWARD,
        description: 'Uma ideia aprovada pelo Rei Demônio!'
      }]);

    return { success: true };
  } catch (error: any) {
    throw new Error("Falha ao recompensar o jogador: " + error.message);
  }
}

export async function fetchProfilesPage(pageParam: number, limit = 10, filters?: { search?: string, guildId?: string, rank?: string }) {
  const admin = getSupabaseAdmin(process.env.SUPABASE_SERVICE_ROLE_KEY!);
  const from = pageParam * limit;
  const to = from + limit - 1;

  let query = admin.from('profiles').select('*, guild_members(guild_id, guilds(name))');

  // Filtro por Nome
  if (filters?.search) {
    query = query.ilike('github_username', `%${filters.search}%`);
  }
  
  // Filtro por Guilda (ou Lobo Solitário). A tabela guild_members permite
  // que o mesmo jogador esteja em mais de uma guilda.
  if (filters?.guildId && filters.guildId !== 'all') {
    if (filters.guildId === 'none') {
      query = query.is('guild_members', null);
    } else {
      query = admin
        .from('profiles')
        .select('*, guild_members!inner(guild_id, guilds(name))')
        .eq('guild_members.guild_id', filters.guildId);
    }
  }

  // Filtro por Patente (Assume que a coluna rank_tier no banco está sincronizada)
  if (filters?.rank && filters.rank !== 'all') {
    query = query.eq('rank_tier', filters.rank);
  }

  const { data } = await query.order('total_xp', { ascending: false }).range(from, to);
  return data || [];
}

export async function fetchSuggestionsPage(pageParam: number, limit = 10, statusFilter?: string) {
  const admin = getSupabaseAdmin(process.env.SUPABASE_SERVICE_ROLE_KEY!);
  const from = pageParam * limit;
  const to = from + limit - 1;

  let query = admin.from('suggestions').select('*, profiles(github_username, avatar_url)');

  // Filtro por Status
  if (statusFilter && statusFilter !== 'all') {
    if (statusFilter === 'pending') {
       query = query.in('status', ['pending', 'pendente', 'PENDENTE']);
    } else if (statusFilter === 'completed') {
       query = query.in('status', ['completed', 'concluida', 'CONCLUÍDA']);
    }
  } else {
    // Se for 'all', ordena para mostrar pendentes primeiro
    query = query.order('status', { ascending: false }); 
  }

  const { data } = await query.order('created_at', { ascending: false }).range(from, to);
  return data || [];
}

export async function fetchGuildsData() {
  const admin = getSupabaseAdmin(process.env.SUPABASE_SERVICE_ROLE_KEY!);
  const { data } = await admin.from('guilds').select('*');
  return data || [];
}

export async function editGuildAction(guildId: string, formData: FormData) {
  const name = formData.get("name") as string;
  const department = formData.get("department") as string;
  const iconUrl = formData.get("iconUrl") as string;
  const validDepartments = ["SEAP", "PHP", "JAVA", "GLOBAL"];

  if (!validDepartments.includes(department)) {
    throw new Error("Selecione um departamento válido.");
  }
  
  const finalIconUrl = iconUrl || `https://api.dicebear.com/7.x/shapes/svg?seed=${name}&backgroundColor=cbd5e1`;
  const admin = getSupabaseAdmin(process.env.SUPABASE_SERVICE_ROLE_KEY!);
  
  const { error } = await admin.from("guilds").update({ name, department, icon_url: finalIconUrl }).eq("id", guildId);
  if (error) throw new Error(error.message);
  return { success: true };
}

export async function syncUserTechStackAction(userId: string, githubUsername: string) {
  try {
    const res = await fetch(`https://api.github.com/users/${githubUsername}/repos?per_page=50&sort=pushed`, {
      headers: { 'User-Agent': 'GitQuest-App' },
      cache: 'no-store'
    });
    
    if (!res.ok) throw new Error("Falha ao buscar no GitHub");
    
    const repos = await res.json();
    const languageCounts: Record<string, number> = {};

    repos.forEach((repo: any) => {
      if (repo.language) {
        languageCounts[repo.language] = (languageCounts[repo.language] || 0) + 1;
      }
    });

    const topLanguages = Object.entries(languageCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(entry => entry[0]);

    if (topLanguages.length > 0) {
      const admin = getSupabaseAdmin(process.env.SUPABASE_SERVICE_ROLE_KEY!);
      await admin.from('profiles').update({ tech_stack: topLanguages }).eq('id', userId);
    }
    return { success: true, stack: topLanguages };
  } catch (error: any) {
    throw new Error(error.message);
  }
}

export async function autoSyncMissingStacksAction() {
  const admin = getSupabaseAdmin(process.env.SUPABASE_SERVICE_ROLE_KEY!);
  
  // Busca apenas usuários que ainda não tem a stack preenchida
  const { data: missingProfiles } = await admin
    .from('profiles')
    .select('id, github_username')
    .is('tech_stack', null)
    .limit(5); // Limite para não estourar a API do GitHub de uma vez

  if (!missingProfiles || missingProfiles.length === 0) return { success: true };

  for (const profile of missingProfiles) {
    if (!profile.github_username) continue;
    try {
      const res = await fetch(`https://api.github.com/users/${profile.github_username}/repos?per_page=20&sort=pushed`, {
        headers: { 'User-Agent': 'GitQuest-App' },
      });
      if (!res.ok) continue;
      
      const repos = await res.json();
      const counts: Record<string, number> = {};
      repos.forEach((repo: any) => { if (repo.language) counts[repo.language] = (counts[repo.language] || 0) + 1; });
      const top = Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 3).map(e => e[0]);
      
      await admin.from('profiles').update({ tech_stack: top }).eq('id', profile.id);
    } catch (e) {
      console.error(e);
    }
  }
  return { success: true };
}

export async function updatePlayerRoleAction(userId: string, newRole: string) {
  const admin = getSupabaseAdmin(process.env.SUPABASE_SERVICE_ROLE_KEY!);
  const { error } = await admin.from("profiles").update({ class_type: newRole }).eq("id", userId);
  if (error) throw new Error(error.message);
  return { success: true };
}
