
-- ==========================================
-- 1. PARENTS
-- ==========================================

CREATE TABLE public.parents (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    cin TEXT NOT NULL UNIQUE,
    full_name TEXT NOT NULL,
    auth_email TEXT NOT NULL UNIQUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==========================================
-- 2. CHILDREN
-- ==========================================

CREATE TABLE public.children (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    parent_id UUID NOT NULL REFERENCES public.parents(id) ON DELETE CASCADE,
    display_name TEXT NOT NULL,
    pin_hash TEXT NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_children_parent
ON public.children(parent_id);

-- ==========================================
-- 3. CHILD SESSIONS
-- ==========================================

CREATE TABLE public.child_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    child_id UUID NOT NULL REFERENCES public.children(id) ON DELETE CASCADE,
    token_hash TEXT NOT NULL UNIQUE,
    expires_at TIMESTAMPTZ NOT NULL,
    revoked_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==========================================
-- 4. THEMES
-- ==========================================

CREATE TABLE public.themes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    image_url TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==========================================
-- 5. QUIZZES
-- ==========================================

CREATE TABLE public.quizzes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    theme_id UUID NOT NULL REFERENCES public.themes(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_quizzes_theme
ON public.quizzes(theme_id);

-- ==========================================
-- 6. QUESTIONS
-- ==========================================

CREATE TABLE public.questions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    quiz_id UUID NOT NULL REFERENCES public.quizzes(id) ON DELETE CASCADE,
    question_text TEXT NOT NULL,
    question_type TEXT NOT NULL DEFAULT 'multiple_choice',
    explanation TEXT,
    position INTEGER NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(quiz_id, position)
);

-- ==========================================
-- 7. QUESTION OPTIONS
-- ==========================================

CREATE TABLE public.question_options (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    question_id UUID NOT NULL REFERENCES public.questions(id) ON DELETE CASCADE,
    option_text TEXT NOT NULL,
    position INTEGER NOT NULL,
    UNIQUE(question_id, position),
    UNIQUE(question_id, id)
);

-- ==========================================
-- 8. QUESTION ANSWER KEYS
-- Correct answers - private backend data
-- ==========================================

CREATE TABLE public.question_answer_keys (
    question_id UUID PRIMARY KEY REFERENCES public.questions(id) ON DELETE CASCADE,
    correct_option_id UUID NOT NULL,
    FOREIGN KEY (question_id, correct_option_id)
        REFERENCES public.question_options(question_id, id)
        ON DELETE CASCADE
);

-- ==========================================
-- 9. QUIZ ATTEMPTS
-- ==========================================

CREATE TABLE public.quiz_attempts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    child_id UUID NOT NULL REFERENCES public.children(id) ON DELETE CASCADE,
    quiz_id UUID NOT NULL REFERENCES public.quizzes(id) ON DELETE CASCADE,

    status TEXT NOT NULL DEFAULT 'in_progress'
        CHECK (status IN ('in_progress', 'completed')),

    current_question INTEGER DEFAULT 1,
    score INTEGER DEFAULT 0,

    started_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_attempts_child
ON public.quiz_attempts(child_id);

CREATE INDEX idx_attempts_quiz
ON public.quiz_attempts(quiz_id);

-- ==========================================
-- 10. CHILD ANSWERS
-- ==========================================

CREATE TABLE public.child_answers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    attempt_id UUID NOT NULL REFERENCES public.quiz_attempts(id) ON DELETE CASCADE,
    question_id UUID NOT NULL REFERENCES public.questions(id) ON DELETE CASCADE,
    selected_option_id UUID NOT NULL REFERENCES public.question_options(id),

    is_correct BOOLEAN NOT NULL,

    answered_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(attempt_id, question_id)
);

CREATE INDEX idx_answers_attempt
ON public.child_answers(attempt_id);

-- ==========================================
-- 11. PARENTING TIPS
-- ==========================================

CREATE TABLE public.parenting_tips (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    category TEXT,
    example TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==========================================
-- END OF DATABASE STRUCTURE
-- ==========================================
INSERT INTO public.themes (name, description)
VALUES
('Sociale', 'Développement des compétences sociales'),
('hygiène', 'Description de la deuxième thématique'),
('Education sexuelle', 'Description de la troisième thématique');
INSERT INTO public.parenting_tips
(title, content, category, example)
VALUES
(
  'Écoutez votre enfant',
  'Prenez le temps d''écouter votre enfant sans le juger.',
  'Communication',
  'Laissez-le exprimer ses émotions avant de donner votre avis.'
),
(
  'Encouragez les efforts',
  'Valorisez les efforts plutôt que le résultat final.',
  'Motivation',
  'Félicitez votre enfant pour sa persévérance.'
),
(
  'Apprenez à gérer les émotions',
  'Aidez votre enfant à reconnaître et exprimer ses émotions.',
  'Émotions',
  'Demandez-lui comment il se sent et pourquoi.'
);

CREATE OR REPLACE FUNCTION public.get_daily_parenting_tip()
RETURNS TABLE (
    id UUID,
    title TEXT,
    content TEXT,
    category TEXT,
    example TEXT
)
LANGUAGE SQL
STABLE
AS $$
    SELECT
        tip.id,
        tip.title,
        tip.content,
        tip.category,
        tip.example
    FROM public.parenting_tips AS tip
    WHERE tip.is_active = TRUE
    ORDER BY tip.created_at, tip.id
    OFFSET (
        SELECT
            (
                CURRENT_DATE - DATE '2026-01-01'
            ) % COUNT(*)::INTEGER
        FROM public.parenting_tips
        WHERE is_active = TRUE
    )
    LIMIT 1;
$$;

ALTER TABLE public.parents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.children ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.child_sessions ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.themes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quizzes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.question_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.question_answer_keys ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.quiz_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.child_answers ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.parenting_tips ENABLE ROW LEVEL SECURITY;
-- Parent : consultation de son profil

CREATE POLICY "Parent reads own profile"
ON public.parents
FOR SELECT
TO authenticated
USING (id = auth.uid());

-- Parent : modification de son profil

CREATE POLICY "Parent updates own profile"
ON public.parents
FOR UPDATE
TO authenticated
USING (id = auth.uid())
WITH CHECK (id = auth.uid());

-- Parent : consultation de ses enfants

CREATE POLICY "Parent reads own children"
ON public.children
FOR SELECT
TO authenticated
USING (parent_id = auth.uid());

-- Parent : ajout d'enfants

CREATE POLICY "Parent creates own children"
ON public.children
FOR INSERT
TO authenticated
WITH CHECK (parent_id = auth.uid());

-- Parent : modification des enfants

CREATE POLICY "Parent updates own children"
ON public.children
FOR UPDATE
TO authenticated
USING (parent_id = auth.uid())
WITH CHECK (parent_id = auth.uid());

-- Parent : suppression des enfants

CREATE POLICY "Parent deletes own children"
ON public.children
FOR DELETE
TO authenticated
USING (parent_id = auth.uid());
CREATE POLICY "Read active themes"
ON public.themes
FOR SELECT
TO anon, authenticated
USING (is_active = TRUE);

CREATE POLICY "Read active quizzes"
ON public.quizzes
FOR SELECT
TO authenticated
USING (
    is_active = TRUE
    AND EXISTS (
        SELECT 1
        FROM public.themes t
        WHERE t.id = theme_id
        AND t.is_active = TRUE
    )
);

CREATE POLICY "Read quiz questions"
ON public.questions
FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1
        FROM public.quizzes q
        JOIN public.themes t ON t.id = q.theme_id
        WHERE q.id = quiz_id
        AND q.is_active = TRUE
        AND t.is_active = TRUE
    )
);

CREATE POLICY "Read question options"
ON public.question_options
FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1
        FROM public.questions q
        JOIN public.quizzes z ON z.id = q.quiz_id
        WHERE q.id = question_id
        AND z.is_active = TRUE
    )
);
CREATE POLICY "Parent reads child attempts"
ON public.quiz_attempts
FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1
        FROM public.children c
        WHERE c.id = child_id
        AND c.parent_id = auth.uid()
    )
);

CREATE POLICY "Parent reads child answers"
ON public.child_answers
FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1
        FROM public.quiz_attempts a
        JOIN public.children c ON c.id = a.child_id
        WHERE a.id = attempt_id
        AND c.parent_id = auth.uid()
    )
);
CREATE POLICY "Read active parenting tips"
ON public.parenting_tips
FOR SELECT
TO authenticated
USING (is_active = TRUE);

CREATE OR REPLACE FUNCTION public.get_daily_parenting_tip()
RETURNS TABLE (
    id UUID,
    title TEXT,
    content TEXT,
    category TEXT,
    example TEXT
)
LANGUAGE SQL
STABLE
AS $$
    WITH active_tips AS (
        SELECT
            id,
            title,
            content,
            category,
            example,
            ROW_NUMBER() OVER (
                ORDER BY created_at, id
            ) AS tip_number,
            COUNT(*) OVER () AS total_tips
        FROM public.parenting_tips
        WHERE is_active = TRUE
    ),
    current_day AS (
        SELECT
            (NOW() AT TIME ZONE 'Africa/Tunis')::DATE
            - DATE '2026-01-01' AS day_number
    )
    SELECT
        t.id,
        t.title,
        t.content,
        t.category,
        t.example
    FROM active_tips t
    CROSS JOIN current_day d
    WHERE t.tip_number =
        ((d.day_number % t.total_tips) + t.total_tips)
        % t.total_tips + 1;
$$;
CREATE UNIQUE INDEX one_active_attempt_per_child_quiz
ON public.quiz_attempts(child_id, quiz_id)
WHERE status = 'in_progress';
REVOKE ALL ON public.question_answer_keys
FROM anon, authenticated;

REVOKE ALL ON public.child_sessions
FROM anon, authenticated;
REVOKE ALL ON FUNCTION public.get_daily_parenting_tip()
FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.get_daily_parenting_tip()
TO authenticated;
ALTER TABLE public.children
ADD COLUMN age INTEGER
CHECK (age BETWEEN 4 AND 15);
