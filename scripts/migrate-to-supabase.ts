import { Client } from 'pg';

const connectionString =
  process.env.DATABASE_URL ||
  'postgresql://postgres:Mockfast1122@db.rsnmxdyqrmkjsfxwypek.supabase.co:5432/postgres';

const tables = [
  'users',
  'usernames',
  'wallets',
  'wallet_transactions',
  'walletTransactions',
  'withdrawals',
  'gpStore',
  'institutions',
  'masterInstitutions',
  'departments',
  'academicLevels',
  'seasons',
  'seasonParticipations',
  'qualifications',
  'qualificationAttempts',
  'representativeAssignments',
  'standings',
  'fixtures',
  'questionSets',
  'gusSeasons',
  'gusRegistrations',
  'gusParticipants',
  'gusQuestions',
  'gusQuestionsMeta',
  'gusAnswers',
  'gusWinners',
  'gusPrizeTransactions',
  'gusCompetitions',
  'gusLive',
  'championsSeasons',
  'championsQualifiers',
  'championsGroups',
  'championsFeatureDays',
  'championsFixtures',
  'championsQuestions',
  'championsStandings',
  'championsAuditLogs',
  'groupBattleSeasons',
  'groupBattleTeams',
  'school_dome_seasons',
  'school_dome_registrations',
  'school_dome_questions',
  'school_dome_messages',
  'school_dome_results',
  'competition_hints',
  'chatroom_live_messages',
  'chatroom_live_questions',
  'daily_chat_responses',
  'system_settings',
  'settings',
  'posts',
  'announcements',
  'notifications',
  'sponsors',
  'platformEvents',
  'events',
  'subscriptionPlans',
  'userSubscriptions',
  'transactions',
  'past_questions',
  'past_question_views',
  'past_question_uploads',
  'past_question_bookmarks',
  'past_question_settings',
  'campus_memberships',
  'campus_connection_requests',
  'libraryGenerations',
  'librarySettings',
  'airtimeDataTransactions',
  'airtimeDataSettings',
  'airtimeDataAuditLogs',
  'minimartProducts',
  'minimartCategories',
  'minimartReports',
  'minimartConfig',
  'managerAssignments',
  'managerActivityLogs',
  'auditLogs',
  'studentVerifications',
  'verificationRequests',
  'sugCampaigns',
  'sugSections',
  'sugPositions',
  'sugCandidates',
  'sugVotes',
  'sugResults',
  'sugManagers',
  'sugManagerRequests',
  'sugAuditLogs',
  'liveSessions',
  'liveMatches',
  'matchResults',
  'user_handout_usage',
  'user_handouts',
  'handout_library_settings',
  'curriculumData',
  'dataFiles'
];

async function runMigration() {
  console.log('Connecting to PostgreSQL database at:', connectionString);
  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false },
  });

  try {
    await client.connect();
    console.log('Successfully connected to Supabase PostgreSQL!');

    // Create a generic function to auto-update updated_at
    await client.query(`
      CREATE OR REPLACE FUNCTION update_updated_at_column()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.updated_at = NOW();
        RETURN NEW;
      END;
      $$ language 'plpgsql';
    `);

    for (const tableName of tables) {
      // Postgres table names with quotes to support mixedCase as well as snake_case
      const quotedTable = `"${tableName}"`;
      console.log(`Setting up table: ${quotedTable}...`);

      await client.query(`
        CREATE TABLE IF NOT EXISTS ${quotedTable} (
          id TEXT PRIMARY KEY,
          data JSONB NOT NULL DEFAULT '{}'::jsonb,
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW()
        );
      `);

      // Create an index on data (gin index for deep JSON queries)
      await client.query(`
        CREATE INDEX IF NOT EXISTS "idx_${tableName}_data_gin" ON ${quotedTable} USING GIN (data);
      `);

      // Enable Row Level Security (RLS) and permit anon & authenticated access
      await client.query(`
        ALTER TABLE ${quotedTable} ENABLE ROW LEVEL SECURITY;
      `);

      await client.query(`
        DO $$
        BEGIN
          IF NOT EXISTS (
            SELECT 1 FROM pg_policies WHERE tablename = '${tableName}' AND policyname = 'Allow public access on ${tableName}'
          ) THEN
            CREATE POLICY "Allow public access on ${tableName}" ON ${quotedTable}
            FOR ALL USING (true) WITH CHECK (true);
          END IF;
        END $$;
      `);
    }

    // Insert or ensure Super Admin user record exists
    const superAdminUid = '4403bd2b-e385-479b-af16-058582fa4ee3';
    const superAdminEmail = 'grobaxycompany@gmail.com';

    const superAdminPayload = {
      id: superAdminUid,
      uid: superAdminUid,
      name: 'Grobaax Super Admin',
      fullName: 'Grobaax Super Admin',
      username: 'superadmin',
      usernameLower: 'superadmin',
      email: superAdminEmail,
      role: 'super_admin',
      isVerified: true,
      isVip: true,
      membershipTier: 'vip',
      balanceGP: 1000000,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await client.query(
      `
      INSERT INTO "users" (id, data, created_at, updated_at)
      VALUES ($1, $2, NOW(), NOW())
      ON CONFLICT (id) DO UPDATE
      SET data = "users".data || $2, updated_at = NOW();
    `,
      [superAdminUid, JSON.stringify(superAdminPayload)]
    );

    // Also insert into managerAssignments for super admin
    const managerPayload = {
      id: superAdminUid,
      uid: superAdminUid,
      name: 'Grobaax Super Admin',
      email: superAdminEmail,
      role: 'super_admin',
      assignedByUid: superAdminUid,
      assignedByName: 'System Bootstrapper',
      assignedAt: new Date().toISOString(),
      status: 'active',
      permissions: ['*'],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await client.query(
      `
      INSERT INTO "managerAssignments" (id, data, created_at, updated_at)
      VALUES ($1, $2, NOW(), NOW())
      ON CONFLICT (id) DO UPDATE
      SET data = "managerAssignments".data || $2, updated_at = NOW();
    `,
      [superAdminUid, JSON.stringify(managerPayload)]
    );

    // Add tables to realtime publication if available
    try {
      const realtimeTables = [
        'chatroom_live_messages',
        'chatroom_live_questions',
        'daily_chat_responses',
        'notifications',
        'announcements',
        'wallets',
        'wallet_transactions',
        'walletTransactions',
        'posts',
        'system_settings',
        'school_dome_messages',
        'school_dome_questions'
      ];
      for (const rtTable of realtimeTables) {
        await client.query(`
          DO $$
          BEGIN
            IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
              ALTER PUBLICATION supabase_realtime ADD TABLE "${rtTable}";
            END IF;
          EXCEPTION WHEN others THEN
            -- table might already be in publication, ignore
          END $$;
        `);
      }
      console.log('Realtime publication updated for live tables.');
    } catch (rtErr) {
      console.warn('Notice adding to realtime publication:', (rtErr as any).message);
    }

    // Notify postgREST schema cache to reload
    await client.query("NOTIFY pgrst, 'reload schema';");
    console.log('Reloaded PostgREST schema cache!');

    console.log('Supabase tables successfully created and initialized!');
  } catch (err) {
    console.error('Migration failed:', err);
  } finally {
    await client.end();
  }
}

runMigration();
