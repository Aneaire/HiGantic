import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@agent-maker/shared/convex/_generated/api";
import { useNavigate } from "react-router";
import {
  Sparkles,
  User,
  Briefcase,
  Palette,
  ArrowLeft,
  Loader2,
  X,
  Rocket,
} from "lucide-react";
import {
  ONBOARDING_CATEGORIES,
  type Template,
} from "~/lib/templates";

const CATEGORY_ICONS = {
  personal: User,
  work: Briefcase,
  creative: Palette,
} as const;

const CATEGORY_COLORS = {
  personal: "from-emerald-500/20 to-emerald-600/5 ring-emerald-500/20 text-emerald-400",
  work: "from-blue-500/20 to-blue-600/5 ring-blue-500/20 text-blue-400",
  creative: "from-purple-500/20 to-purple-600/5 ring-purple-500/20 text-purple-400",
} as const;

type CategoryId = "personal" | "work" | "creative";

export function OnboardingOverlay({ onComplete }: { onComplete: () => void }) {
  const navigate = useNavigate();
  const createFromTemplate = useMutation(api.agents.createFromTemplate);
  const completeOnboarding = useMutation(api.users.completeOnboarding);

  const [step, setStep] = useState<1 | 2>(1);
  const [selectedCategory, setSelectedCategory] = useState<CategoryId | null>(null);
  const [creating, setCreating] = useState<string | null>(null);

  async function handleSkip() {
    await completeOnboarding();
    onComplete();
  }

  function handleCategorySelect(categoryId: CategoryId) {
    setSelectedCategory(categoryId);
    setStep(2);
  }

  async function handleTemplateSelect(template: Template) {
    setCreating(template.id);
    try {
      const agentId = await createFromTemplate({
        name: template.name,
        description: template.description,
        systemPrompt: template.systemPrompt,
        model: template.model,
        enabledToolSets: template.enabledToolSets,
        starterPages: template.starterPages,
        starterEndpoints: template.starterEndpoints,
      });
      await completeOnboarding();
      navigate(`/agents/${agentId}`);
    } catch (err: any) {
      console.error("Failed to create agent:", err);
      setCreating(null);
    }
  }

  const selectedCategoryData = ONBOARDING_CATEGORIES.find(
    (c) => c.id === selectedCategory
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/90 backdrop-blur-xl">
      <div className="relative w-full max-w-2xl mx-4">
        {/* Skip button */}
        <button
          onClick={handleSkip}
          className="absolute -top-12 right-0 flex items-center gap-1.5 text-xs text-zinc-600 hover:text-zinc-400 transition-colors"
        >
          Skip for now
          <X className="h-3.5 w-3.5" />
        </button>

        <div className="rounded-3xl border border-zinc-800/80 bg-zinc-950 shadow-2xl shadow-black/40 overflow-hidden">
          {/* Header */}
          <div className="px-8 pt-8 pb-2 text-center">
            <div className="flex justify-center mb-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-neon-400/20 to-neon-600/5 ring-1 ring-neon-400/20">
                {step === 1 ? (
                  <Sparkles className="h-7 w-7 text-neon-400" />
                ) : (
                  <Rocket className="h-7 w-7 text-neon-400" />
                )}
              </div>
            </div>
            <h2 className="text-xl font-bold tracking-tight">
              {step === 1 ? "Welcome! What will your agent do?" : "Pick a template to start"}
            </h2>
            <p className="mt-2 text-sm text-zinc-500">
              {step === 1
                ? "Choose a category and we'll set up your first agent in seconds"
                : `${selectedCategoryData?.label} templates — ${selectedCategoryData?.description}`}
            </p>
          </div>

          {/* Step indicator */}
          <div className="flex justify-center gap-1.5 py-3">
            <div className={`h-1 w-8 rounded-full transition-colors ${step >= 1 ? "bg-neon-400" : "bg-zinc-800"}`} />
            <div className={`h-1 w-8 rounded-full transition-colors ${step >= 2 ? "bg-neon-400" : "bg-zinc-800"}`} />
          </div>

          {/* Content */}
          <div className="px-8 pb-8">
            {step === 1 ? (
              /* Step 1: Category selection */
              <div className="grid grid-cols-3 gap-3 mt-2">
                {ONBOARDING_CATEGORIES.map((category) => {
                  const Icon = CATEGORY_ICONS[category.id];
                  const colorClass = CATEGORY_COLORS[category.id];
                  return (
                    <button
                      key={category.id}
                      onClick={() => handleCategorySelect(category.id)}
                      className="group flex flex-col items-center gap-3 rounded-2xl border border-zinc-800 bg-zinc-900/30 p-6 hover:border-zinc-600 hover:bg-zinc-900/60 transition-all"
                    >
                      <div
                        className={`flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br ${colorClass} ring-1`}
                      >
                        <Icon className="h-6 w-6" />
                      </div>
                      <div className="text-center">
                        <p className="text-sm font-semibold group-hover:text-white transition-colors">
                          {category.label}
                        </p>
                        <p className="mt-1 text-[11px] text-zinc-600 leading-snug">
                          {category.description}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            ) : (
              /* Step 2: Template selection */
              <div>
                <button
                  onClick={() => setStep(1)}
                  className="flex items-center gap-1 text-xs text-zinc-500 hover:text-zinc-300 mb-4 transition-colors"
                >
                  <ArrowLeft className="h-3 w-3" />
                  Back
                </button>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {selectedCategoryData?.templates.map((template) => {
                    const Icon = template.icon;
                    const isCreating = creating === template.id;
                    return (
                      <button
                        key={template.id}
                        onClick={() => handleTemplateSelect(template)}
                        disabled={creating !== null}
                        className="group text-left rounded-2xl border border-zinc-800 bg-zinc-900/30 p-4 hover:border-zinc-600 hover:bg-zinc-900/60 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <div className="flex items-start gap-3">
                          <div
                            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${template.color} ring-1`}
                          >
                            {isCreating ? (
                              <Loader2 className="h-4.5 w-4.5 text-zinc-300 animate-spin" />
                            ) : (
                              <Icon className="h-4.5 w-4.5 text-zinc-300" />
                            )}
                          </div>
                          <div className="min-w-0">
                            <h3 className="text-sm font-semibold group-hover:text-white transition-colors">
                              {template.name}
                            </h3>
                            <p className="mt-0.5 text-[11px] text-zinc-500 leading-relaxed line-clamp-2">
                              {template.description}
                            </p>
                            <div className="mt-2 flex flex-wrap gap-1">
                              {template.starterPages.map((page) => (
                                <span
                                  key={page.label}
                                  className="text-[9px] text-zinc-600 bg-zinc-800/60 px-1.5 py-0.5 rounded-full"
                                >
                                  {page.label}
                                </span>
                              ))}
                            </div>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
