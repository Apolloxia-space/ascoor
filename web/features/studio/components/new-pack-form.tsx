'use client';

import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  Building2,
  CarFront,
  Check,
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
import { PACK_GENERATION_FAILED_MESSAGE, PACK_GENERATION_FAILED_TITLE } from '../messages';
import { useStudioStore } from '../stores/use-studio-store';
import { buildTraceId, type ApiError } from '@/shared/api/fetcher';
import {
  getListWorkspacePackGenerationJobsQueryKey,
  useGetBillingStatus,
  useGetBillingUsage,
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

type NewPackFormProps = {
  active?: boolean;
  layout?: 'dialog' | 'page';
  onComplete?: () => void;
};

type SearchableSelectOption = {
  id: string;
  label: string;
  description: string;
  thumbnailSrc?: string;
  icon?: ReactNode;
  group?: string;
};

const ADDITIONAL_DIRECTION_MAX_CHARS = 300;
const isDevelopmentEnvironment = process.env.NODE_ENV === 'development';
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

export function NewPackForm({
  active = true,
  layout = 'dialog',
  onComplete,
}: NewPackFormProps) {
  const isPageLayout = layout === 'page';
  const router = useRouter();
  const queryClient = useQueryClient();
  const isSendingRef = useRef(false);
  const [selectedTheme, setSelectedTheme] = useState<PackTheme>('post_apocalyptic');
  const [presetPickerOpen, setPresetPickerOpen] = useState(false);
  const [presetSearchInput, setPresetSearchInput] = useState('');
  const [activePresetGroup, setActivePresetGroup] = useState('');
  const [themePickerOpen, setThemePickerOpen] = useState(false);
  const [themeSearchInput, setThemeSearchInput] = useState('');
  const [activeThemeGroup, setActiveThemeGroup] = useState('');
  const [selectedPackType, setSelectedPackType] = useState<PackType>('street_props');
  const [selectedStyle, setSelectedStyle] = useState<PackStyle>('low_poly');
  const [selectedAssetCount, setSelectedAssetCount] = useState<PackAssetCount>(6);
  const [notesInput, setNotesInput] = useState('');
  const [promptCopied, setPromptCopied] = useState(false);
  const [packTypePickerOpen, setPackTypePickerOpen] = useState(false);
  const [packTypeSearchInput, setPackTypeSearchInput] = useState('');
  const [activePackTypeGroup, setActivePackTypeGroup] = useState('');
  const [upgradeDialogMode, setUpgradeDialogMode] = useState<'limit' | 'concurrency' | null>(null);
  const [assetPackErrorDialogOpen, setAssetPackErrorDialogOpen] = useState(false);
  const addWorkspace = useStudioStore((state) => state.addWorkspace);
  const addPendingAssetPack = useStudioStore((state) => state.addPendingAssetPack);
  const setWorkspace = useStudioStore((state) => state.setWorkspace);
  const setRightPanelMode = useStudioStore((state) => state.setRightPanelMode);
  const setChatPanelOpen = useStudioStore((state) => state.setChatPanelOpen);
  const { createWorkspace, invalidateWorkspaces } = useStudioApi();
  const { createAssetPack, invalidateWorkspaceAssetPacks } = useChatConversationApi(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const isBusy = isSending || isGenerating;

  const billingQuery = useGetBillingStatus({
    query: {
      enabled: active,
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      retry: false,
    },
  });
  const billingUsageQuery = useGetBillingUsage({
    query: {
      enabled: active,
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      retry: false,
    },
  });
  const billingStatus = billingQuery.data?.status === 200 ? billingQuery.data.data : undefined;
  const billingUsage =
    billingUsageQuery.data?.status === 200 ? billingUsageQuery.data.data : undefined;
  const hasPaidPlan = billingStatus?.status === 'active' || billingStatus?.status === 'trialing';
  const showUpgrade = !hasPaidPlan;
  const requiredCredits = selectedAssetCount;
  const remainingCredits = billingUsage?.balance;
  const monthlyLimitReached =
    billingUsage !== undefined && billingUsage.balance < requiredCredits;

  useEffect(() => {
    if (!active) {
      setSelectedTheme('post_apocalyptic');
      setPresetPickerOpen(false);
      setPresetSearchInput('');
      setActivePresetGroup('');
      setThemePickerOpen(false);
      setThemeSearchInput('');
      setActiveThemeGroup('');
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
      setAssetPackErrorDialogOpen(false);
      isSendingRef.current = false;
    }
  }, [active]);

  const handleSelectPreset = (preset: PackPreset) => {
    setSelectedTheme(preset.theme);
    setSelectedPackType(preset.packType);
    setSelectedStyle(preset.style);
    setSelectedAssetCount(preset.assetCount);
    setNotesInput(preset.notes);
  };

  const handleChangeTheme = (value: PackTheme) => {
    setSelectedTheme(value);
    setNotesInput('');
  };

  const handleChangePackType = (value: PackType) => {
    setSelectedPackType(value);
    setNotesInput('');
  };

  const handleChangeStyle = (value: PackStyle) => {
    setSelectedStyle(value);
    setNotesInput('');
  };

  const handleChangeAssetCount = (value: PackAssetCount) => {
    setSelectedAssetCount(value);
    setNotesInput('');
  };

  const generatedPrompt = buildStructuredPackPrompt({
    theme: selectedTheme,
    packType: selectedPackType,
    style: selectedStyle,
    assetCount: selectedAssetCount,
    notes: notesInput,
  });

  const selectedPresetId =
    PACK_PRESETS.find(
      (preset) =>
        selectedTheme === preset.theme &&
        selectedPackType === preset.packType &&
        selectedStyle === preset.style &&
        selectedAssetCount === preset.assetCount &&
        notesInput.trim() === preset.notes.trim(),
    )?.id ?? '';

  const selectedThemeOption =
    PACK_THEME_OPTIONS.find((option) => option.id === selectedTheme) ?? PACK_THEME_OPTIONS[0];
  const presetOptions = useMemo<Array<SearchableSelectOption>>(
    () =>
      PACK_PRESETS.map((preset) => {
        const themeOption =
          PACK_THEME_OPTIONS.find((option) => option.id === preset.theme) ?? PACK_THEME_OPTIONS[0];

        return {
          id: preset.id,
          label: preset.title,
          description: buildPackSummary({
            theme: preset.theme,
            packType: preset.packType,
            style: preset.style,
            assetCount: preset.assetCount,
          }),
          thumbnailSrc: themeOption.thumbnailSrc,
          group: themeOption.group,
        };
      }),
    [],
  );
  const themeGroups = useMemo(
    () =>
      Array.from(new Set(PACK_THEME_OPTIONS.map((option) => option.group).filter(Boolean))) as Array<string>,
    [],
  );
  const normalizedThemeSearch = themeSearchInput.trim().toLowerCase();
  const selectedPresetOption =
    presetOptions.find((option) => option.id === selectedPresetId) ?? null;
  const presetGroups = useMemo(
    () => Array.from(new Set(presetOptions.map((option) => option.group).filter(Boolean))) as Array<string>,
    [presetOptions],
  );
  const normalizedPresetSearch = presetSearchInput.trim().toLowerCase();
  const filteredPresetOptions = normalizedPresetSearch
    ? presetOptions.filter((option) =>
        `${option.label} ${option.description} ${option.group ?? ''}`
          .toLowerCase()
          .includes(normalizedPresetSearch),
      )
    : presetOptions.filter(
        (option) =>
          option.group ===
          (activePresetGroup ||
            (selectedPresetOption?.group && presetGroups.includes(selectedPresetOption.group)
              ? selectedPresetOption.group
              : (presetGroups[0] ?? ''))),
      );
  const filteredThemeOptions = normalizedThemeSearch
    ? PACK_THEME_OPTIONS.filter((option) =>
        `${option.label} ${option.description} ${option.group ?? ''}`
          .toLowerCase()
          .includes(normalizedThemeSearch),
      )
    : PACK_THEME_OPTIONS.filter(
        (option) =>
          option.group ===
          (activeThemeGroup ||
            (selectedThemeOption?.group && themeGroups.includes(selectedThemeOption.group)
              ? selectedThemeOption.group
              : (themeGroups[0] ?? ''))),
      );

  useEffect(() => {
    if (!presetPickerOpen) return;

    const nextGroup =
      selectedPresetOption?.group && presetGroups.includes(selectedPresetOption.group)
        ? selectedPresetOption.group
        : (presetGroups[0] ?? '');
    setActivePresetGroup(nextGroup);
    setPresetSearchInput('');
  }, [presetGroups, presetPickerOpen, selectedPresetOption?.group]);

  useEffect(() => {
    if (!themePickerOpen) return;

    const nextGroup =
      selectedThemeOption?.group && themeGroups.includes(selectedThemeOption.group)
        ? selectedThemeOption.group
        : (themeGroups[0] ?? '');
    setActiveThemeGroup(nextGroup);
    setThemeSearchInput('');
  }, [themePickerOpen, selectedThemeOption?.group, themeGroups]);

  const packTypeOptionsWithIcons = useMemo<Array<SearchableSelectOption>>(
    () =>
      PACK_TYPE_OPTIONS.map((option) => ({
        ...option,
        icon: PACK_TYPE_ICON_BY_ID[option.id],
        group: option.group,
      })),
    [],
  );
  const selectedPackTypeOption = useMemo(
    () =>
      packTypeOptionsWithIcons.find((option) => option.id === selectedPackType) ??
      packTypeOptionsWithIcons[0],
    [packTypeOptionsWithIcons, selectedPackType],
  );
  const packTypeGroups = useMemo(
    () =>
      Array.from(new Set(packTypeOptionsWithIcons.map((option) => option.group).filter(Boolean))) as Array<string>,
    [packTypeOptionsWithIcons],
  );
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
    setAssetPackErrorDialogOpen(false);
    setUpgradeDialogMode(null);

    if (monthlyLimitReached) {
      setUpgradeDialogMode('limit');
      setIsSending(false);
      isSendingRef.current = false;
      return;
    }

    try {
      setIsGenerating(true);
      const workspaceName = buildWorkspaceName(promptPreview);
      const workspace = await createWorkspace(workspaceName);
      addWorkspace({ id: workspace.id, name: workspace.name });
      setWorkspace(workspace.id, workspace.name);
      invalidateWorkspaces();
      router.replace(buildStudioPath(workspace.id));

      const traceId = buildTraceId();
      const gen = await createAssetPack.mutateAsync({
        data: {
          workspaceId: workspace.id,
          userPrompt,
        },
        traceId,
      });
      addPendingAssetPack({
        packGenerationJobId: gen.packGenerationJobId,
        workspaceId: workspace.id,
        traceId,
        promptPreview,
        userPrompt,
      });
      invalidateWorkspaceAssetPacks(workspace.id);
      queryClient.invalidateQueries({
        queryKey: getListWorkspacePackGenerationJobsQueryKey(workspace.id, { limit: 50 }),
      });
      setRightPanelMode('create');
      setChatPanelOpen(true);
      setNotesInput('');
      onComplete?.();
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
        errorCode === 'credit_balance_insufficient' ||
        (typeof errorMessage === 'string' &&
          errorMessage.includes('Not enough credits'));
      const isConcurrencyLimitError =
        apiError?.status === 409 || errorCode === 'pack_generation_concurrency_limit_exceeded';

      if (isConcurrencyLimitError) {
        setUpgradeDialogMode('concurrency');
      } else if (isLimitError) {
        setUpgradeDialogMode('limit');
      } else {
        setAssetPackErrorDialogOpen(true);
      }
    } finally {
      setIsGenerating(false);
      setIsSending(false);
      isSendingRef.current = false;
    }
  };

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
      <div
        className={cn(
          'flex flex-col overflow-hidden',
          layout === 'dialog'
            ? 'h-[calc(100dvh-2rem)] w-[calc(100vw-2rem)] max-w-[calc(100vw-2rem)] sm:w-[min(100vw-3rem,64rem)] sm:max-w-[min(100vw-3rem,64rem)]'
            : 'min-h-0 w-full flex-1 bg-transparent',
        )}
      >
        {!isPageLayout ? (
          <div className="shrink-0 border-b border-border/70 px-6 py-5">
            <h2 className="text-lg font-semibold text-foreground">New Pack</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Start from a proven pack shape, then add optional direction.
            </p>
          </div>
        ) : null}
        <div
          className={cn(
            'min-h-0 flex-1 overflow-y-auto',
            isPageLayout ? 'space-y-7 px-0 pb-8 pt-0 md:space-y-8' : 'space-y-5 px-6 pb-6 pt-5',
          )}
        >
            <section className={cn('space-y-2', isPageLayout && 'px-1')}>
              <div className="space-y-1">
                <p className="text-base font-medium text-foreground">Start from an example</p>
                <p className="text-xs text-muted-foreground">
                  Pick a preset, then adjust the pack settings if needed.
                </p>
              </div>
              <button
                type="button"
                className="flex w-full items-center justify-between gap-3 rounded-md border border-border/70 bg-background px-3 py-3 text-left transition-colors hover:bg-accent/30 disabled:opacity-60"
                onClick={() => {
                  setActivePresetGroup(selectedPresetOption?.group ?? presetGroups[0] ?? '');
                  setPresetPickerOpen(true);
                }}
                disabled={isBusy}
              >
                <div className="flex min-w-0 items-center gap-3">
                  {selectedPresetOption?.thumbnailSrc ? (
                    <Image
                      src={selectedPresetOption.thumbnailSrc}
                      alt=""
                      width={48}
                      height={32}
                      sizes="48px"
                      className="h-8 w-12 shrink-0 rounded-sm border border-border/70 object-cover"
                    />
                  ) : null}
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-foreground">
                      {selectedPresetOption?.label ?? 'Select an example'}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {selectedPresetOption?.group}
                      {selectedPresetOption?.description
                        ? ` • ${selectedPresetOption.description}`
                        : ''}
                    </p>
                  </div>
                </div>
                <span className="shrink-0 text-xs text-muted-foreground">Browse all</span>
              </button>
            </section>

            <section className={cn('space-y-2', isPageLayout && 'px-1')}>
              <div className="space-y-1">
                <p className="text-base font-medium text-foreground">Theme</p>
                <p className="text-xs text-muted-foreground">
                  Choose a base world style, then add your own details below.
                </p>
              </div>
              <button
                type="button"
                className="flex w-full items-center justify-between gap-3 rounded-md border border-border/70 bg-background px-3 py-3 text-left transition-colors hover:bg-accent/30 disabled:opacity-60"
                onClick={() => {
                  setActiveThemeGroup(selectedThemeOption?.group ?? themeGroups[0] ?? '');
                  setThemePickerOpen(true);
                }}
                disabled={isBusy}
              >
                <div className="flex min-w-0 items-center gap-3">
                  {selectedThemeOption?.thumbnailSrc ? (
                    <Image
                      src={selectedThemeOption.thumbnailSrc}
                      alt=""
                      width={48}
                      height={32}
                      sizes="48px"
                      className="h-8 w-12 shrink-0 rounded-sm border border-border/70 object-cover"
                    />
                  ) : null}
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-foreground">
                      {selectedThemeOption?.label ?? 'Select a theme'}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {selectedThemeOption?.group}
                      {selectedThemeOption?.description
                        ? ` • ${selectedThemeOption.description}`
                        : ''}
                    </p>
                  </div>
                </div>
                <span className="shrink-0 text-xs text-muted-foreground">Browse all</span>
              </button>
            </section>

            <section className={cn('space-y-2', isPageLayout && 'px-1')}>
              <div className="space-y-1">
                <p className="text-base font-medium text-foreground">What are you making?</p>
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
                  {selectedPackTypeOption?.thumbnailSrc ? (
                    <Image
                      src={selectedPackTypeOption.thumbnailSrc}
                      alt=""
                      width={48}
                      height={48}
                      sizes="48px"
                      className="size-12 shrink-0 rounded-sm border border-border/70 bg-muted/40 object-contain"
                    />
                  ) : (
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-sm border border-border/70 bg-muted text-muted-foreground">
                      {selectedPackTypeOption?.icon}
                    </span>
                  )}
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

            <section className={cn('space-y-2', isPageLayout && 'px-1')}>
              <p className="text-base font-medium text-foreground">Style</p>
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

            <section className={cn('space-y-2', isPageLayout && 'px-1')}>
              <p className="text-base font-medium text-foreground">Asset count</p>
              <div className="flex h-11 w-full max-w-xs items-center rounded-md border border-border/70 bg-background">
                <button
                  type="button"
                  className="flex h-full w-12 items-center justify-center text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-50"
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
                  className="flex h-full w-12 items-center justify-center text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-50"
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
              <p className="text-xs text-muted-foreground">
                This pack will use {requiredCredits} credits.
                {remainingCredits !== undefined
                  ? ` ${remainingCredits} credits remaining this month.`
                  : ''}
              </p>
            </section>

            <section className={cn('space-y-2', isPageLayout && 'px-1')}>
              <div className="space-y-1">
                <p className="text-base font-medium text-foreground">Additional direction</p>
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

            {isDevelopmentEnvironment ? (
              <section className={cn('space-y-2', isPageLayout && 'px-1')}>
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <p className="text-base font-medium text-foreground">Generated prompt</p>
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
                <div className="max-h-56 overflow-y-auto rounded-md border border-border/70 bg-muted px-3 py-3">
                  <pre className="whitespace-pre-wrap break-words text-xs leading-5 text-foreground">
                    {generatedPrompt}
                  </pre>
                </div>
              </section>
            ) : null}

            <div className={cn('flex items-center justify-end', isPageLayout && 'px-1')}>
              <Button
                className="rounded-lg"
                disabled={isBusy || createAssetPack.isPending}
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
      </div>
      <Dialog open={presetPickerOpen} onOpenChange={setPresetPickerOpen}>
        <DialogContent className="flex h-[calc(100dvh-4rem)] w-[calc(100vw-2rem)] max-w-[calc(100vw-2rem)] flex-col overflow-hidden p-0 sm:h-[min(100dvh-5rem,44rem)] sm:w-[min(100vw-4rem,72rem)] sm:max-w-[min(100vw-4rem,72rem)]">
          <DialogHeader className="shrink-0 border-b border-border/70 px-6 py-5 pr-12">
            <DialogTitle>Choose Example</DialogTitle>
            <DialogDescription>
              Browse by group or search across all example packs.
            </DialogDescription>
          </DialogHeader>
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
            <div className="border-b border-border/70 px-6 py-4">
              <Input
                value={presetSearchInput}
                onChange={(event) => setPresetSearchInput(event.target.value)}
                placeholder="Search example packs..."
                autoFocus
              />
            </div>
            <div className="flex min-h-0 flex-1 flex-col sm:flex-row">
              <div className="shrink-0 border-b border-border/70 sm:w-56 sm:border-b-0 sm:border-r sm:border-border/70">
                <div className="flex gap-2 overflow-x-auto px-4 py-3 sm:block sm:space-y-1 sm:overflow-visible">
                  {presetGroups.map((group) => (
                    <button
                      key={group}
                      type="button"
                      className={cn(
                        'shrink-0 rounded-md px-3 py-2 text-left text-sm transition-colors',
                        !normalizedPresetSearch && group === activePresetGroup
                          ? 'bg-muted text-foreground'
                          : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                      )}
                      onClick={() => {
                        setActivePresetGroup(group);
                        setPresetSearchInput('');
                      }}
                    >
                      {group}
                    </button>
                  ))}
                </div>
              </div>
              <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 pb-8 sm:px-5 sm:pb-5">
                <div className="grid gap-2 md:grid-cols-2">
                  {(normalizedPresetSearch
                    ? filteredPresetOptions
                    : presetOptions.filter((option) => option.group === activePresetGroup)
                  ).map((option, index, list) => {
                    const previousGroup = index > 0 ? list[index - 1]?.group : null;
                    const showGroupLabel = Boolean(
                      normalizedPresetSearch && option.group && option.group !== previousGroup,
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
                            option.id === selectedPresetId
                              ? 'border-primary bg-primary/10'
                              : 'border-border/70 bg-background hover:bg-accent/30',
                          )}
                          onClick={() => {
                            const preset = PACK_PRESETS.find((item) => item.id === option.id);
                            if (preset) {
                              handleSelectPreset(preset);
                            }
                            setPresetSearchInput('');
                            setPresetPickerOpen(false);
                          }}
                        >
                          {option.thumbnailSrc ? (
                            <Image
                              src={option.thumbnailSrc}
                              alt=""
                              width={64}
                              height={42}
                              sizes="64px"
                              className="mt-0.5 h-10 w-16 shrink-0 rounded-sm border border-border/70 object-cover"
                            />
                          ) : null}
                          <div className="min-w-0 flex-1">
                            <div className="text-sm font-medium text-foreground">{option.label}</div>
                            <div className="mt-1 text-xs text-muted-foreground">
                              {option.description}
                            </div>
                          </div>
                          {option.id === selectedPresetId ? (
                            <Check className="mt-0.5 size-4 shrink-0 text-primary" />
                          ) : null}
                        </button>
                      </div>
                    );
                  })}
                </div>
                {(normalizedPresetSearch ? filteredPresetOptions.length === 0 : false) ? (
                  <div className="py-10 text-center text-sm text-muted-foreground">
                    No matching example packs found.
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      <Dialog open={themePickerOpen} onOpenChange={setThemePickerOpen}>
        <DialogContent className="flex h-[calc(100dvh-4rem)] w-[calc(100vw-2rem)] max-w-[calc(100vw-2rem)] flex-col overflow-hidden p-0 sm:h-[min(100dvh-5rem,44rem)] sm:w-[min(100vw-4rem,72rem)] sm:max-w-[min(100vw-4rem,72rem)]">
          <DialogHeader className="shrink-0 border-b border-border/70 px-6 py-5 pr-12">
            <DialogTitle>Choose Theme</DialogTitle>
            <DialogDescription>
              Browse by group or search across all themes.
            </DialogDescription>
          </DialogHeader>
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
            <div className="border-b border-border/70 px-6 py-4">
              <Input
                value={themeSearchInput}
                onChange={(event) => setThemeSearchInput(event.target.value)}
                placeholder="Search themes..."
                autoFocus
              />
            </div>
            <div className="flex min-h-0 flex-1 flex-col sm:flex-row">
              <div className="shrink-0 border-b border-border/70 sm:w-56 sm:border-b-0 sm:border-r sm:border-border/70">
                <div className="flex gap-2 overflow-x-auto px-4 py-3 sm:block sm:space-y-1 sm:overflow-visible">
                  {themeGroups.map((group) => (
                    <button
                      key={group}
                      type="button"
                      className={cn(
                        'shrink-0 rounded-md px-3 py-2 text-left text-sm transition-colors',
                        !normalizedThemeSearch && group === activeThemeGroup
                          ? 'bg-muted text-foreground'
                          : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                      )}
                      onClick={() => {
                        setActiveThemeGroup(group);
                        setThemeSearchInput('');
                      }}
                    >
                      {group}
                    </button>
                  ))}
                </div>
              </div>
              <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 pb-8 sm:px-5 sm:pb-5">
                <div className="grid gap-2 md:grid-cols-2">
                  {(normalizedThemeSearch
                    ? filteredThemeOptions
                    : PACK_THEME_OPTIONS.filter((option) => option.group === activeThemeGroup)
                  ).map((option, index, list) => {
                    const previousGroup = index > 0 ? list[index - 1]?.group : null;
                    const showGroupLabel = Boolean(
                      normalizedThemeSearch && option.group && option.group !== previousGroup,
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
                            option.id === selectedTheme
                              ? 'border-primary bg-primary/10'
                              : 'border-border/70 bg-background hover:bg-accent/30',
                          )}
                          onClick={() => {
                            handleChangeTheme(option.id as PackTheme);
                            setThemeSearchInput('');
                            setThemePickerOpen(false);
                          }}
                        >
                          {option.thumbnailSrc ? (
                            <Image
                              src={option.thumbnailSrc}
                              alt=""
                              width={64}
                              height={42}
                              sizes="64px"
                              className="mt-0.5 h-10 w-16 shrink-0 rounded-sm border border-border/70 object-cover"
                            />
                          ) : null}
                          <div className="min-w-0 flex-1">
                            <div className="text-sm font-medium text-foreground">{option.label}</div>
                            <div className="mt-1 text-xs text-muted-foreground">
                              {option.description}
                            </div>
                          </div>
                          {option.id === selectedTheme ? (
                            <Check className="mt-0.5 size-4 shrink-0 text-primary" />
                          ) : null}
                        </button>
                      </div>
                    );
                  })}
                </div>
                {(normalizedThemeSearch ? filteredThemeOptions.length === 0 : false) ? (
                  <div className="py-10 text-center text-sm text-muted-foreground">
                    No matching themes found.
                  </div>
                ) : null}
              </div>
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
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
            <div className="border-b border-border/70 px-6 py-4">
              <Input
                value={packTypeSearchInput}
                onChange={(event) => setPackTypeSearchInput(event.target.value)}
                placeholder="Search categories..."
                autoFocus
              />
            </div>
            <div className="flex min-h-0 flex-1 flex-col sm:flex-row">
              <div className="shrink-0 border-b border-border/70 sm:w-56 sm:border-b-0 sm:border-r sm:border-border/70">
                <div className="flex gap-2 overflow-x-auto px-4 py-3 sm:block sm:space-y-1 sm:overflow-visible">
                  {packTypeGroups.map((group) => (
                    <button
                      key={group}
                      type="button"
                      className={cn(
                        'shrink-0 rounded-md px-3 py-2 text-left text-sm transition-colors',
                        !normalizedPackTypeSearch && group === activePackTypeGroup
                          ? 'bg-muted text-foreground'
                          : 'text-muted-foreground hover:bg-muted hover:text-foreground',
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
              <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 pb-8 sm:px-5 sm:pb-5">
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
                          {option.thumbnailSrc ? (
                            <Image
                              src={option.thumbnailSrc}
                              alt=""
                              width={48}
                              height={48}
                              sizes="48px"
                              className="mt-0.5 size-12 shrink-0 rounded-sm border border-border/70 bg-muted/40 object-contain"
                            />
                          ) : (
                            <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-sm border border-border/70 bg-muted text-muted-foreground">
                              {option.icon}
                            </span>
                          )}
                          <div className="min-w-0 flex-1">
                            <div className="text-sm font-medium text-foreground">{option.label}</div>
                            <div className="mt-1 text-xs text-muted-foreground">
                              {option.description}
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
              {upgradeDialogMode === 'concurrency'
                ? 'Concurrent pack limit reached'
                : 'Not enough credits'}
            </DialogTitle>
            <DialogDescription>
              {upgradeDialogMode === 'concurrency'
                ? 'You have reached the number of assets that can be awaiting preview at the same time. Open a pending asset and complete its preview before creating another.'
                : 'You do not have enough credits remaining for this pack. Choose fewer assets, upgrade, or wait for the next reset.'}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            {showUpgrade ? <Button onClick={() => router.push(paths.plan)}>View plans</Button> : null}
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={assetPackErrorDialogOpen} onOpenChange={setAssetPackErrorDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{PACK_GENERATION_FAILED_TITLE}</DialogTitle>
            <DialogDescription>{PACK_GENERATION_FAILED_MESSAGE}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button onClick={() => setAssetPackErrorDialogOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
