'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  Building2,
  CarFront,
  Check,
  ChevronDown,
  Cpu,
  Copy,
  Factory,
  Hammer,
  Home,
  Lamp,
  Loader2,
  Minus,
  Plus,
  Shield,
  Sofa,
  Send,
  Store,
  Trees,
  Wrench,
} from 'lucide-react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';

import { useChatConversationApi } from '../hooks/use-chat-api';
import { useStudioApi } from '../hooks/use-studio-api';
import {
  buildPackSummary,
  buildStructuredPackPrompt,
  buildWorkspaceName,
  PACK_ASSET_COUNT_OPTIONS,
  PACK_PRESETS,
  PACK_STYLE_OPTIONS,
  PACK_THEME_OPTIONS,
  PACK_TYPE_OPTIONS,
  type PackAssetCount,
  type PackPreset,
  type PackStyle,
  type PackTheme,
  type PackType,
} from '../lib/new-pack-config';
import { buildStudioPath } from '../lib/paths';
import { DESIGN_FAILED_MESSAGE, DESIGN_FAILED_TITLE } from '../messages';
import { useStudioStore } from '../stores/use-studio-store';
import { buildTraceId, type ApiError } from '@/shared/api/fetcher';
import {
  getListProjectDesignJobsQueryKey,
  useGetBillingStatus,
} from '@/shared/api/generated/client';
import { Button } from '@shared/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@shared/components/ui/dialog';
import { Input } from '@shared/components/ui/input';
import { Textarea } from '@shared/components/ui/textarea';
import { paths } from '@/shared/constants/paths';
import { cn } from '@shared/lib/utils';

type NewPackDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

type SearchableSelectOption = {
  id: string;
  label: string;
  description: string;
  thumbnailSrc?: string;
  icon?: ReactNode;
  group?: string;
};

const THEME_DETAILS_MAX_CHARS = 300;
const ADDITIONAL_DIRECTION_MAX_CHARS = 300;
const PACK_TYPE_ICON_BY_ID: Record<PackType, ReactNode> = {
  street_props: <Building2 className="size-4" />,
  interior_props: <Home className="size-4" />,
  market_props: <Store className="size-4" />,
  industrial_props: <Factory className="size-4" />,
  vehicles: <CarFront className="size-4" />,
  weapons_gear: <Shield className="size-4" />,
  nature_items: <Trees className="size-4" />,
  ruins_debris: <Hammer className="size-4" />,
  signs_lighting: <Lamp className="size-4" />,
  furniture_decor: <Sofa className="size-4" />,
  sci_fi_devices: <Cpu className="size-4" />,
  building_pieces: <Wrench className="size-4" />,
  food_kitchen: <Home className="size-4" />,
  office_studio: <Building2 className="size-4" />,
  medical_lab: <Cpu className="size-4" />,
  sewer_utility: <Wrench className="size-4" />,
  docks_fishing: <Store className="size-4" />,
  farm_rural: <Trees className="size-4" />,
  desert_camp: <Trees className="size-4" />,
  military_base: <Shield className="size-4" />,
  shrine_relics: <Lamp className="size-4" />,
  magic_items: <Lamp className="size-4" />,
  dungeon_traps: <Hammer className="size-4" />,
  robots_drones: <Cpu className="size-4" />,
  retail_store: <Store className="size-4" />,
  transit_station: <CarFront className="size-4" />,
  construction_site: <Factory className="size-4" />,
  park_playground: <Trees className="size-4" />,
  snow_arctic_gear: <Trees className="size-4" />,
  festival_decor: <Lamp className="size-4" />,
  containers_storage: <Wrench className="size-4" />,
  rooftop_hvac: <Factory className="size-4" />,
  bathroom_laundry: <Home className="size-4" />,
  classroom_library: <Building2 className="size-4" />,
  music_stage: <Lamp className="size-4" />,
  graveyard_funerary: <Hammer className="size-4" />,
  cave_crystals: <Trees className="size-4" />,
  space_cargo: <Cpu className="size-4" />,
  mech_parts: <Cpu className="size-4" />,
  prison_security: <Shield className="size-4" />,
  casino_lounge: <Store className="size-4" />,
  sports_recreation: <Trees className="size-4" />,
  temple_garden: <Lamp className="size-4" />,
  office_security: <Shield className="size-4" />,
  power_plant: <Factory className="size-4" />,
  junkyard_scrap: <Hammer className="size-4" />,
  camping_outdoor: <Trees className="size-4" />,
  suburban_home: <Home className="size-4" />,
  small_boats: <CarFront className="size-4" />,
  airfield_hangar: <CarFront className="size-4" />,
};

function SearchableSelect({
  value,
  options,
  placeholder,
  disabled = false,
  onChange,
}: {
  value: string;
  options: Array<SearchableSelectOption>;
  placeholder: string;
  disabled?: boolean;
  onChange: (value: string) => void;
}) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');

  const selectedOption = options.find((option) => option.id === value) ?? null;
  const hasLeadingVisual = !open && Boolean(selectedOption?.thumbnailSrc || selectedOption?.icon);
  const normalizedQuery = query.trim().toLowerCase();
  const filteredOptions = normalizedQuery
    ? options.filter((option) =>
        `${option.label} ${option.description} ${option.group ?? ''}`
          .toLowerCase()
          .includes(normalizedQuery),
      )
    : options;

  useEffect(() => {
    if (!open) return;

    const handlePointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
        setQuery('');
      }
    };

    window.addEventListener('mousedown', handlePointerDown);
    return () => window.removeEventListener('mousedown', handlePointerDown);
  }, [open]);

  return (
    <div ref={rootRef} className="relative">
      {!open && selectedOption?.thumbnailSrc ? (
        <Image
          src={selectedOption.thumbnailSrc}
          alt=""
          width={36}
          height={24}
          sizes="36px"
          className="pointer-events-none absolute left-2 top-1/2 h-6 w-9 -translate-y-1/2 rounded-sm border border-border/70 object-cover"
        />
      ) : null}
      {!open && !selectedOption?.thumbnailSrc && selectedOption?.icon ? (
        <span className="pointer-events-none absolute left-3 top-1/2 flex size-5 -translate-y-1/2 items-center justify-center text-muted-foreground">
          {selectedOption.icon}
        </span>
      ) : null}
      <Input
        value={open ? query : (selectedOption?.label ?? '')}
        placeholder={placeholder}
        disabled={disabled}
        className={cn(
          'pr-10',
          hasLeadingVisual && (selectedOption?.thumbnailSrc ? 'pl-14' : 'pl-10'),
        )}
        onFocus={() => {
          setOpen(true);
          setQuery('');
        }}
        onChange={(event) => {
          setQuery(event.target.value);
          setOpen(true);
        }}
      />
      <button
        type="button"
        className="absolute right-0 top-0 flex h-9 w-9 items-center justify-center text-muted-foreground"
        onClick={() => {
          if (disabled) return;
          setOpen((current) => !current);
          setQuery('');
        }}
        disabled={disabled}
        aria-label="Toggle options"
      >
        <ChevronDown className="size-4" />
      </button>
      {open ? (
        <div className="absolute left-0 right-0 top-[calc(100%+0.375rem)] z-50 overflow-hidden rounded-md border border-border bg-popover shadow-md">
          <div className="max-h-64 overflow-y-auto p-1">
            {filteredOptions.length === 0 ? (
              <div className="px-2 py-2 text-sm text-muted-foreground">No matches found.</div>
            ) : (
              filteredOptions.map((option, index) => {
                const previousGroup = index > 0 ? filteredOptions[index - 1]?.group : null;
                const showGroupLabel = Boolean(option.group && option.group !== previousGroup);

                return (
                  <div key={option.id}>
                    {showGroupLabel ? (
                      <div className="px-2 pb-1 pt-2 text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
                        {option.group}
                      </div>
                    ) : null}
                    <button
                      type="button"
                      className={cn(
                        'flex w-full items-start gap-2 rounded-sm px-2 py-2 text-left text-sm transition-colors hover:bg-accent hover:text-accent-foreground',
                        option.id === value && 'bg-accent/60 text-accent-foreground',
                      )}
                      onMouseDown={(event) => event.preventDefault()}
                      onClick={() => {
                        onChange(option.id);
                        setOpen(false);
                        setQuery('');
                      }}
                    >
                      {option.thumbnailSrc ? (
                        <Image
                          src={option.thumbnailSrc}
                          alt=""
                          width={48}
                          height={32}
                          sizes="48px"
                          className="mt-0.5 h-8 w-12 shrink-0 rounded-sm border border-border/70 object-cover"
                        />
                      ) : option.icon ? (
                        <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-sm border border-border/70 bg-muted/40 text-muted-foreground">
                          {option.icon}
                        </span>
                      ) : null}
                      <div className="min-w-0 flex-1">
                        <div>{option.label}</div>
                        <div className="text-xs text-muted-foreground">{option.description}</div>
                      </div>
                      {option.id === value ? <Check className="mt-0.5 size-4 shrink-0" /> : null}
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}

export function NewPackDialog({ open, onOpenChange }: NewPackDialogProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const isSendingRef = useRef(false);
  const [selectedTheme, setSelectedTheme] = useState<PackTheme>('post_apocalyptic');
  const [themeDetailsInput, setThemeDetailsInput] = useState('');
  const [selectedPackType, setSelectedPackType] = useState<PackType>('street_props');
  const [selectedStyle, setSelectedStyle] = useState<PackStyle>('low_poly');
  const [selectedAssetCount, setSelectedAssetCount] = useState<PackAssetCount>(6);
  const [notesInput, setNotesInput] = useState('');
  const [promptCopied, setPromptCopied] = useState(false);
  const [packTypePickerOpen, setPackTypePickerOpen] = useState(false);
  const [packTypeSearchInput, setPackTypeSearchInput] = useState('');
  const [activePackTypeGroup, setActivePackTypeGroup] = useState('');
  const [upgradeDialogMode, setUpgradeDialogMode] = useState<
    'required' | 'limit' | 'concurrency' | null
  >(null);
  const [designErrorDialogOpen, setDesignErrorDialogOpen] = useState(false);
  const addProject = useStudioStore((state) => state.addProject);
  const addPendingDesign = useStudioStore((state) => state.addPendingDesign);
  const setProject = useStudioStore((state) => state.setProject);
  const setRightPanelMode = useStudioStore((state) => state.setRightPanelMode);
  const setChatPanelOpen = useStudioStore((state) => state.setChatPanelOpen);
  const { createProject, invalidateProjects } = useStudioApi();
  const { createDesign, invalidateProjectDesigns } = useChatConversationApi(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const isBusy = isSending || isGenerating;

  const billingQuery = useGetBillingStatus({
    query: {
      enabled: open,
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      retry: false,
    },
  });
  const billingStatus = billingQuery.data?.status === 200 ? billingQuery.data.data : undefined;
  const hasPaidPlan = billingStatus?.status === 'active' || billingStatus?.status === 'trialing';
  const showUpgrade = !hasPaidPlan;

  useEffect(() => {
    if (!open) {
      setSelectedTheme('post_apocalyptic');
      setThemeDetailsInput('');
      setSelectedPackType('street_props');
      setSelectedStyle('low_poly');
      setSelectedAssetCount(6);
      setNotesInput('');
      setPromptCopied(false);
      setPackTypePickerOpen(false);
      setPackTypeSearchInput('');
      setActivePackTypeGroup('');
      setIsSending(false);
      setIsGenerating(false);
      setUpgradeDialogMode(null);
      setDesignErrorDialogOpen(false);
      isSendingRef.current = false;
    }
  }, [open]);

  const handleSelectPreset = (preset: PackPreset) => {
    setSelectedTheme(preset.theme);
    setThemeDetailsInput('');
    setSelectedPackType(preset.packType);
    setSelectedStyle(preset.style);
    setSelectedAssetCount(preset.assetCount);
    setNotesInput(preset.notes);
  };

  const handleChangeTheme = (value: PackTheme) => {
    setSelectedTheme(value);
    setThemeDetailsInput('');
    setNotesInput('');
  };

  const handleChangePackType = (value: PackType) => {
    setSelectedPackType(value);
    setThemeDetailsInput('');
    setNotesInput('');
  };

  const handleChangeStyle = (value: PackStyle) => {
    setSelectedStyle(value);
    setThemeDetailsInput('');
    setNotesInput('');
  };

  const handleChangeAssetCount = (value: PackAssetCount) => {
    setSelectedAssetCount(value);
    setThemeDetailsInput('');
    setNotesInput('');
  };

  const generatedPrompt = buildStructuredPackPrompt({
    theme: selectedTheme,
    themeDetails: themeDetailsInput,
    packType: selectedPackType,
    style: selectedStyle,
    assetCount: selectedAssetCount,
    notes: notesInput,
  });

  const packTypeOptionsWithIcons: Array<SearchableSelectOption> = PACK_TYPE_OPTIONS.map((option) => ({
    ...option,
    icon: PACK_TYPE_ICON_BY_ID[option.id],
    group: option.group,
  }));
  const selectedPackTypeOption =
    packTypeOptionsWithIcons.find((option) => option.id === selectedPackType) ??
    packTypeOptionsWithIcons[0];
  const packTypeGroups = Array.from(
    new Set(packTypeOptionsWithIcons.map((option) => option.group).filter(Boolean)),
  ) as Array<string>;
  const normalizedPackTypeSearch = packTypeSearchInput.trim().toLowerCase();
  const filteredPackTypeOptions = normalizedPackTypeSearch
    ? packTypeOptionsWithIcons.filter((option) =>
        `${option.label} ${option.description} ${option.group ?? ''}`
          .toLowerCase()
          .includes(normalizedPackTypeSearch),
      )
    : packTypeOptionsWithIcons.filter(
        (option) =>
          option.group ===
          (activePackTypeGroup ||
            (selectedPackTypeOption?.group && packTypeGroups.includes(selectedPackTypeOption.group)
              ? selectedPackTypeOption.group
              : (packTypeGroups[0] ?? ''))),
      );

  useEffect(() => {
    if (!packTypePickerOpen) return;

    const nextGroup =
      selectedPackTypeOption?.group && packTypeGroups.includes(selectedPackTypeOption.group)
        ? selectedPackTypeOption.group
        : (packTypeGroups[0] ?? '');
    setActivePackTypeGroup(nextGroup);
    setPackTypeSearchInput('');
  }, [packTypePickerOpen, selectedPackTypeOption?.group, packTypeGroups]);

  const handleSend = async () => {
    if (isSendingRef.current) return;
    isSendingRef.current = true;
    setIsSending(true);

    const userPrompt = generatedPrompt;
    const promptPreview = buildPackSummary({
      theme: selectedTheme,
      packType: selectedPackType,
      style: selectedStyle,
      assetCount: selectedAssetCount,
    });
    setDesignErrorDialogOpen(false);
    setUpgradeDialogMode(null);

    try {
      setIsGenerating(true);
      const workspaceName = buildWorkspaceName(promptPreview);
      const project = await createProject(workspaceName);
      addProject({ id: project.id, name: project.name });
      setProject(project.id, project.name);
      invalidateProjects();
      router.replace(buildStudioPath(project.id));

      const traceId = buildTraceId();
      const gen = await createDesign.mutateAsync({
        data: {
          projectId: project.id,
          userPrompt,
        },
        traceId,
      });
      addPendingDesign({
        designId: gen.designJobId,
        projectId: project.id,
        traceId,
        promptPreview,
        userPrompt,
      });
      invalidateProjectDesigns(project.id);
      queryClient.invalidateQueries({
        queryKey: getListProjectDesignJobsQueryKey(project.id, { limit: 50 }),
      });
      setRightPanelMode('create');
      setChatPanelOpen(true);
      setNotesInput('');
      onOpenChange(false);
    } catch (error) {
      const apiError = error as ApiError<{ error?: string; code?: string }>;
      const errorMessage =
        apiError?.body && typeof apiError.body === 'object'
          ? (apiError.body as { error?: string }).error
          : undefined;
      const errorCode =
        apiError?.body && typeof apiError.body === 'object'
          ? (apiError.body as { code?: string }).code
          : undefined;
      const isLimitError =
        apiError?.status === 429 ||
        errorCode === 'design_limit_exceeded' ||
        (typeof errorMessage === 'string' &&
          (errorMessage.includes('Monthly generated design limit') ||
            errorMessage.includes('Monthly generated file limit')));
      const isConcurrencyLimitError =
        apiError?.status === 409 || errorCode === 'design_concurrency_limit_exceeded';
      const isSubscriptionRequiredError =
        apiError?.status === 402 || errorCode === 'pro_subscription_required';

      if (isSubscriptionRequiredError) {
        setUpgradeDialogMode('required');
      } else if (isConcurrencyLimitError) {
        setUpgradeDialogMode('concurrency');
      } else if (isLimitError) {
        setUpgradeDialogMode('limit');
      } else {
        setDesignErrorDialogOpen(true);
      }
    } finally {
      setIsGenerating(false);
      setIsSending(false);
      isSendingRef.current = false;
    }
  };

  const selectedPresetId =
    PACK_PRESETS.find(
      (preset) =>
        selectedTheme === preset.theme &&
        selectedPackType === preset.packType &&
        selectedStyle === preset.style &&
        selectedAssetCount === preset.assetCount &&
        notesInput.trim() === preset.notes.trim(),
    )?.id ?? '';

  const handleCopyPrompt = async () => {
    try {
      await navigator.clipboard.writeText(generatedPrompt);
      setPromptCopied(true);
      window.setTimeout(() => setPromptCopied(false), 1500);
    } catch {
      setPromptCopied(false);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="flex h-[calc(100dvh-2rem)] w-[calc(100vw-2rem)] max-w-[calc(100vw-2rem)] flex-col overflow-hidden p-0 sm:w-[min(100vw-3rem,64rem)] sm:max-w-[min(100vw-3rem,64rem)]">
          <DialogHeader className="shrink-0 border-b border-border/70 px-6 py-5 pr-12">
            <DialogTitle>New Pack</DialogTitle>
            <DialogDescription>
              Start from a proven pack shape, then add optional direction.
            </DialogDescription>
          </DialogHeader>
          <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-6 pb-6 pt-5">
            <section className="space-y-2">
              <div className="space-y-1">
                <p className="text-sm font-medium text-foreground">Start from an example</p>
                <p className="text-xs text-muted-foreground">
                  Pick a preset, then adjust the pack settings if needed.
                </p>
              </div>
              <SearchableSelect
                value={selectedPresetId}
                options={PACK_PRESETS.map((preset) => ({
                  id: preset.id,
                  label: preset.title,
                  description: buildPackSummary({
                    theme: preset.theme,
                    packType: preset.packType,
                    style: preset.style,
                    assetCount: preset.assetCount,
                  }),
                  thumbnailSrc:
                    PACK_THEME_OPTIONS.find((option) => option.id === preset.theme)?.thumbnailSrc,
                }))}
                placeholder="Search example packs..."
                disabled={isBusy}
                onChange={(value) => {
                  const preset = PACK_PRESETS.find((item) => item.id === value);
                  if (preset) {
                    handleSelectPreset(preset);
                  }
                }}
              />
            </section>

            <section className="space-y-2">
              <div className="space-y-1">
                <p className="text-sm font-medium text-foreground">Theme</p>
                <p className="text-xs text-muted-foreground">
                  Choose a base world style, then add your own details below.
                </p>
              </div>
              <SearchableSelect
                value={selectedTheme}
                options={PACK_THEME_OPTIONS}
                placeholder="Search themes..."
                disabled={isBusy}
                onChange={(value) => handleChangeTheme(value as PackTheme)}
              />
              <div className="rounded-md border border-input bg-transparent px-3 py-2 focus-within:border-ring focus-within:ring-[3px] focus-within:ring-ring/50">
                <Textarea
                  placeholder="Optional theme details. Example: rainy neon backstreets, Japanese retro signage, abandoned subway mood."
                  className="min-h-20 max-h-40 resize-none overflow-y-auto border-0 bg-transparent p-0 text-sm shadow-none focus-visible:ring-0"
                  value={themeDetailsInput}
                  onChange={(event) =>
                    setThemeDetailsInput(event.target.value.slice(0, THEME_DETAILS_MAX_CHARS))
                  }
                  disabled={isBusy}
                  maxLength={THEME_DETAILS_MAX_CHARS}
                />
                <div className="mt-2 flex items-center justify-between gap-3">
                  <p className="text-xs text-muted-foreground">
                    {themeDetailsInput.length}/{THEME_DETAILS_MAX_CHARS}
                  </p>
                </div>
              </div>
            </section>

            <section className="space-y-2">
              <div className="space-y-1">
                <p className="text-sm font-medium text-foreground">What are you making?</p>
                <p className="text-xs text-muted-foreground">
                  Choose the kind of asset set you want to generate.
                </p>
              </div>
              <button
                type="button"
                className="flex w-full items-center justify-between gap-3 rounded-md border border-border/70 bg-background px-3 py-3 text-left transition-colors hover:bg-accent/30 disabled:opacity-60"
                onClick={() => {
                  setActivePackTypeGroup(selectedPackTypeOption?.group ?? packTypeGroups[0] ?? '');
                  setPackTypePickerOpen(true);
                }}
                disabled={isBusy}
              >
                <div className="flex min-w-0 items-center gap-3">
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-sm border border-border/70 bg-muted/40 text-muted-foreground">
                    {selectedPackTypeOption?.icon}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-foreground">
                      {selectedPackTypeOption?.label ?? 'Select a category'}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {selectedPackTypeOption?.group}
                      {selectedPackTypeOption?.description
                        ? ` • ${selectedPackTypeOption.description}`
                        : ''}
                    </p>
                  </div>
                </div>
                <span className="shrink-0 text-xs text-muted-foreground">Browse all</span>
              </button>
            </section>

            <section className="space-y-2">
              <p className="text-sm font-medium text-foreground">Style</p>
              <div className="grid gap-2 sm:grid-cols-2">
                {PACK_STYLE_OPTIONS.map((option) => (
                  <button
                    key={option.id}
                    type="button"
                    className={cn(
                      'rounded-md border px-3 py-3 text-left transition-colors',
                      selectedStyle === option.id
                        ? 'border-primary bg-primary/10'
                        : 'border-border/70 bg-background hover:bg-accent/40',
                    )}
                    onClick={() => handleChangeStyle(option.id)}
                    disabled={isBusy}
                  >
                    <p className="text-sm font-medium text-foreground">{option.label}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{option.description}</p>
                  </button>
                ))}
              </div>
            </section>

            <section className="space-y-2">
              <p className="text-sm font-medium text-foreground">Asset count</p>
              <div className="flex h-11 w-full max-w-xs items-center rounded-md border border-border/70 bg-background">
                <button
                  type="button"
                  className="flex h-full w-12 items-center justify-center text-muted-foreground transition-colors hover:bg-accent/40 hover:text-foreground disabled:opacity-50"
                  onClick={() =>
                    handleChangeAssetCount(
                      Math.max(
                        PACK_ASSET_COUNT_OPTIONS[0],
                        selectedAssetCount - 1,
                      ) as PackAssetCount,
                    )
                  }
                  disabled={isBusy || selectedAssetCount === PACK_ASSET_COUNT_OPTIONS[0]}
                  aria-label="Decrease asset count"
                >
                  <Minus className="size-4" />
                </button>
                <div className="flex min-w-0 flex-1 items-center justify-center border-x border-border/70 px-3">
                  <span className="text-sm font-medium text-foreground">{selectedAssetCount}</span>
                </div>
                <button
                  type="button"
                  className="flex h-full w-12 items-center justify-center text-muted-foreground transition-colors hover:bg-accent/40 hover:text-foreground disabled:opacity-50"
                  onClick={() =>
                    handleChangeAssetCount(
                      Math.min(
                        PACK_ASSET_COUNT_OPTIONS[PACK_ASSET_COUNT_OPTIONS.length - 1],
                        selectedAssetCount + 1,
                      ) as PackAssetCount,
                    )
                  }
                  disabled={
                    isBusy ||
                    selectedAssetCount ===
                      PACK_ASSET_COUNT_OPTIONS[PACK_ASSET_COUNT_OPTIONS.length - 1]
                  }
                  aria-label="Increase asset count"
                >
                  <Plus className="size-4" />
                </button>
              </div>
            </section>

            <section className="space-y-2">
              <div className="space-y-1">
                <p className="text-sm font-medium text-foreground">Additional direction</p>
                <p className="text-xs text-muted-foreground">
                  Optional. Add specific props, materials, or mood notes.
                </p>
              </div>
              <div className="rounded-md border border-input bg-transparent px-3 py-2 focus-within:border-ring focus-within:ring-[3px] focus-within:ring-ring/50">
                <Textarea
                  placeholder="Example: add vending machines, utility boxes, wet pavement props, and glowing signage."
                  className="min-h-28 max-h-56 resize-none overflow-y-auto border-0 bg-transparent p-0 text-sm shadow-none focus-visible:ring-0"
                  value={notesInput}
                  onChange={(event) =>
                    setNotesInput(event.target.value.slice(0, ADDITIONAL_DIRECTION_MAX_CHARS))
                  }
                  disabled={isBusy}
                  maxLength={ADDITIONAL_DIRECTION_MAX_CHARS}
                />
                <div className="mt-2 flex items-center justify-between gap-3">
                  <p className="text-xs text-muted-foreground">
                    {notesInput.length}/{ADDITIONAL_DIRECTION_MAX_CHARS}
                  </p>
                </div>
              </div>
            </section>

            <section className="space-y-2">
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <p className="text-sm font-medium text-foreground">Generated prompt</p>
                  <p className="text-xs text-muted-foreground">
                    This is the exact prompt that will be sent for generation.
                  </p>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="shrink-0 rounded-lg"
                  onClick={handleCopyPrompt}
                >
                  {promptCopied ? <Check className="size-4" /> : <Copy className="size-4" />}
                  {promptCopied ? 'Copied' : 'Copy'}
                </Button>
              </div>
              <div className="max-h-56 overflow-y-auto rounded-md border border-border/70 bg-black/10 px-3 py-3">
                <pre className="whitespace-pre-wrap break-words text-xs leading-5 text-foreground">
                  {generatedPrompt}
                </pre>
              </div>
            </section>

            <div className="flex items-center justify-end">
              <Button
                className="rounded-lg"
                disabled={isBusy || createDesign.isPending}
                onClick={handleSend}
              >
                {isBusy ? (
                  <Loader2 className="mr-2 size-4 animate-spin" />
                ) : (
                  <Send className="mr-2 size-4" />
                )}
                Create pack
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      <Dialog open={packTypePickerOpen} onOpenChange={setPackTypePickerOpen}>
        <DialogContent className="flex h-[calc(100dvh-4rem)] w-[calc(100vw-2rem)] max-w-[calc(100vw-2rem)] flex-col overflow-hidden p-0 sm:h-[min(100dvh-5rem,44rem)] sm:w-[min(100vw-4rem,72rem)] sm:max-w-[min(100vw-4rem,72rem)]">
          <DialogHeader className="shrink-0 border-b border-border/70 px-6 py-5 pr-12">
            <DialogTitle>Choose What You Are Making</DialogTitle>
            <DialogDescription>
              Browse by group or search across all categories.
            </DialogDescription>
          </DialogHeader>
          <div className="min-h-0 flex-1 overflow-hidden">
            <div className="border-b border-border/70 px-6 py-4">
              <Input
                value={packTypeSearchInput}
                onChange={(event) => setPackTypeSearchInput(event.target.value)}
                placeholder="Search categories..."
                autoFocus
              />
            </div>
            <div className="flex h-full min-h-0 flex-col sm:flex-row">
              <div className="shrink-0 border-b border-border/70 sm:w-56 sm:border-b-0 sm:border-r sm:border-border/70">
                <div className="flex gap-2 overflow-x-auto px-4 py-3 sm:block sm:space-y-1 sm:overflow-visible">
                  {packTypeGroups.map((group) => (
                    <button
                      key={group}
                      type="button"
                      className={cn(
                        'shrink-0 rounded-md px-3 py-2 text-left text-sm transition-colors',
                        !normalizedPackTypeSearch && group === activePackTypeGroup
                          ? 'bg-accent text-accent-foreground'
                          : 'text-muted-foreground hover:bg-accent/40 hover:text-foreground',
                      )}
                      onClick={() => {
                        setActivePackTypeGroup(group);
                        setPackTypeSearchInput('');
                      }}
                    >
                      {group}
                    </button>
                  ))}
                </div>
              </div>
              <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-5">
                <div className="grid gap-2 md:grid-cols-2">
                  {(normalizedPackTypeSearch
                    ? filteredPackTypeOptions
                    : packTypeOptionsWithIcons.filter((option) => option.group === activePackTypeGroup)
                  ).map((option, index, list) => {
                    const previousGroup = index > 0 ? list[index - 1]?.group : null;
                    const showGroupLabel = Boolean(
                      normalizedPackTypeSearch && option.group && option.group !== previousGroup,
                    );

                    return (
                      <div key={option.id} className="md:col-span-1">
                        {showGroupLabel ? (
                          <div className="pb-1 pt-2 text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground md:col-span-2">
                            {option.group}
                          </div>
                        ) : null}
                        <button
                          type="button"
                          className={cn(
                            'flex w-full items-start gap-3 rounded-md border px-3 py-3 text-left transition-colors',
                            option.id === selectedPackType
                              ? 'border-primary bg-primary/10'
                              : 'border-border/70 bg-background hover:bg-accent/30',
                          )}
                          onClick={() => {
                            handleChangePackType(option.id as PackType);
                            setPackTypeSearchInput('');
                            setPackTypePickerOpen(false);
                          }}
                        >
                          <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-sm border border-border/70 bg-muted/40 text-muted-foreground">
                            {option.icon}
                          </span>
                          <div className="min-w-0 flex-1">
                            <div className="text-sm font-medium text-foreground">{option.label}</div>
                            <div className="mt-1 text-xs text-muted-foreground">
                              {option.description}
                            </div>
                            <div className="mt-2 text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
                              {option.group}
                            </div>
                          </div>
                          {option.id === selectedPackType ? (
                            <Check className="mt-0.5 size-4 shrink-0 text-primary" />
                          ) : null}
                        </button>
                      </div>
                    );
                  })}
                </div>
                {(normalizedPackTypeSearch ? filteredPackTypeOptions.length === 0 : false) ? (
                  <div className="py-10 text-center text-sm text-muted-foreground">
                    No matching categories found.
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      <Dialog
        open={upgradeDialogMode !== null}
        onOpenChange={(nextOpen) => !nextOpen && setUpgradeDialogMode(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {upgradeDialogMode === 'required'
                ? 'Paid plan required'
                : upgradeDialogMode === 'concurrency'
                  ? 'Concurrent pack limit reached'
                  : 'Pack limit reached'}
            </DialogTitle>
            <DialogDescription>
              {upgradeDialogMode === 'required'
                ? 'Upgrade to a paid plan to continue creating assets.'
                : upgradeDialogMode === 'concurrency'
                  ? 'You have reached the number of assets that can be awaiting preview at the same time. Open a pending asset and complete its preview before creating another.'
                  : 'You have reached your generated asset limit for this month. Upgrade or wait for the next reset.'}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            {showUpgrade || upgradeDialogMode === 'required' ? (
              <Button onClick={() => router.push(paths.plan)}>View plans</Button>
            ) : null}
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={designErrorDialogOpen} onOpenChange={setDesignErrorDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{DESIGN_FAILED_TITLE}</DialogTitle>
            <DialogDescription>{DESIGN_FAILED_MESSAGE}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button onClick={() => setDesignErrorDialogOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
