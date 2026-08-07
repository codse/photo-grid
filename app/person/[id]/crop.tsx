import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image as RNImage,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { ArrowClockwiseIcon } from 'phosphor-react-native/src/icons/ArrowClockwise';
import { CircleHalfIcon } from 'phosphor-react-native/src/icons/CircleHalf';
import { FlipHorizontalIcon } from 'phosphor-react-native/src/icons/FlipHorizontal';
import { ImagesIcon } from 'phosphor-react-native/src/icons/Images';
import { ScissorsIcon } from 'phosphor-react-native/src/icons/Scissors';
import { AdjustModal } from '@/features/sheet/adjust-modal';
import { CropCanvas } from '@/features/sheet/crop-canvas';
import { PeopleStrip } from '@/features/people/people-strip';
import { useSession } from '@/state/session';
import { pickFromLibrary, preparePersonImage } from '@/platform/media';
import {
  BG_REMOVAL_AVAILABLE,
  removeBackground,
} from '@/platform/bg-removal';
import { flipCropHorizontal, rotateCropCW } from '@/core/crop-math';
import { hasAdjustments } from '@/core/adjust-filter';
import { DEFAULT_CROP } from '@/core/types';
import { Button } from '@/ui/primitives';
import { colors, radii, space, type } from '@/ui/tokens';
import { RequirePhoto } from '@/features/session/require-photo';
import type { PhIcon } from '@/features/sheet/size-icons';
import { useTranslation } from 'react-i18next';

export default function PersonCropScreen() {
  return (
    <RequirePhoto>
      <PersonCropBody />
    </RequirePhoto>
  );
}

function PersonCropBody() {
  const { t } = useTranslation();
  const { id } = useLocalSearchParams<{ id: string }>();
  const subjects = useSession((s) => s.subjects);
  const setActivePerson = useSession((s) => s.setActivePerson);
  const setPersonCrop = useSession((s) => s.setPersonCrop);
  const setPersonUri = useSession((s) => s.setPersonUri);
  const replacePersonUri = useSession((s) => s.replacePersonUri);
  const undoPersonUri = useSession((s) => s.undoPersonUri);
  const setPersonAdjust = useSession((s) => s.setPersonAdjust);

  const active = subjects.find((s) => s.id === id) ?? subjects[0];
  const [dims, setDims] = useState<{ w: number; h: number } | null>(null);
  const [busy, setBusy] = useState(false);
  const [bgNote, setBgNote] = useState<string | null>(null);
  const [adjustOpen, setAdjustOpen] = useState(false);

  useEffect(() => {
    if (active?.id) setActivePerson(active.id);
  }, [active?.id, setActivePerson]);

  useEffect(() => {
    if (!active?.url) {
      setDims(null);
      return;
    }
    let cancelled = false;
    RNImage.getSize(
      active.url,
      (w, h) => {
        if (!cancelled) setDims({ w, h });
      },
      () => {
        if (!cancelled) setDims({ w: 1200, h: 1600 });
      },
    );
    return () => {
      cancelled = true;
    };
  }, [active?.url]);

  const goPerson = (personId: string) => {
    router.replace(`/person/${personId}/crop`);
  };

  const choosePhoto = async () => {
    if (!active) return;
    setBusy(true);
    try {
      const img = await pickFromLibrary();
      if (!img) return;
      const prepared = await preparePersonImage(img);
      setPersonUri(active.id, prepared.uri, {
        sourceName: prepared.fileName ?? prepared.uri,
      });
    } catch (e) {
      Alert.alert(
        t('home.libraryOpenFailed'),
        e instanceof Error ? e.message : t('common.unknownError'),
      );
    } finally {
      setBusy(false);
    }
  };

  if (!active) {
    return null;
  }

  const adjusted = hasAdjustments(active.adjust);

  return (
    <View style={{ flex: 1 }}>
      <Stack.Screen options={{ title: active.label }} />
      <PeopleStrip
        enablePhotoPick
        thumbs="source"
        onPersonFocus={goPerson}
      />
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{
          padding: space.xl,
          gap: space.lg,
          paddingBottom: 48,
        }}
      >
        {!active.url ? (
          <Button
            label={busy ? t('common.opening') : t('crop.choosePhoto')}
            disabled={busy}
            onPress={() => void choosePhoto()}
          />
        ) : dims ? (
          <CropCanvas
            uri={active.url}
            imgW={dims.w}
            imgH={dims.h}
            aspect={active.widthMm / active.heightMm}
            crop={active.crop}
            adjust={active.adjust}
            onChange={(c) => setPersonCrop(active.id, c)}
          />
        ) : (
          <ActivityIndicator color={colors.accent} />
        )}

        {active.url ? (
          <>
            <View
              style={{
                flexDirection: 'row',
                gap: 6,
                alignItems: 'stretch',
              }}
            >
              <EditAction
                icon={ArrowClockwiseIcon}
                label={t('crop.rotate')}
                onPress={() =>
                  setPersonCrop(active.id, rotateCropCW(active.crop))
                }
              />
              <EditAction
                icon={FlipHorizontalIcon}
                label={t('crop.flip')}
                onPress={() =>
                  setPersonCrop(active.id, flipCropHorizontal(active.crop))
                }
              />
              <EditAction
                icon={CircleHalfIcon}
                label={t('crop.adjust')}
                selected={adjusted}
                disabled={busy}
                onPress={() => setAdjustOpen(true)}
              />
              {BG_REMOVAL_AVAILABLE ? (
                <EditAction
                  icon={ScissorsIcon}
                  label={busy ? '…' : t('crop.bg')}
                  disabled={busy}
                  onPress={async () => {
                    setBusy(true);
                    setBgNote(null);
                    try {
                      const beforeW = dims?.w ?? 0;
                      const beforeH = dims?.h ?? 0;
                      const result = await removeBackground(active.url);
                      if (result.ok) {
                        replacePersonUri(active.id, result.uri);
                        const afterW = result.width ?? 0;
                        const afterH = result.height ?? 0;
                        // EXIF bake swaps pixel dims — old crop space no longer matches.
                        const orientationBaked =
                          beforeW > 0 &&
                          beforeH > 0 &&
                          afterW > 0 &&
                          afterH > 0 &&
                          beforeW === afterH &&
                          beforeH === afterW;
                        if (orientationBaked) {
                          setPersonCrop(active.id, { ...DEFAULT_CROP });
                        }
                        setBgNote(t('crop.bgWarning'));
                      } else {
                        Alert.alert(t('crop.bgRemovalTitle'), result.reason);
                      }
                    } finally {
                      setBusy(false);
                    }
                  }}
                />
              ) : null}
              <EditAction
                icon={ImagesIcon}
                label={busy ? '…' : t('crop.replace')}
                disabled={busy}
                onPress={() => void choosePhoto()}
              />
            </View>

            {active.previousUrl ? (
              <Button
                label={t('crop.undoBg')}
                variant="ghost"
                onPress={() => {
                  undoPersonUri(active.id);
                  setBgNote(null);
                }}
              />
            ) : null}
            {bgNote ? (
              <Text selectable style={{ ...type.caption, color: colors.accent }}>
                {bgNote}
              </Text>
            ) : null}

            <Button
              label={t('crop.continueSheet')}
              onPress={() => router.push('/sheet')}
            />

            <AdjustModal
              visible={adjustOpen}
              uri={active.url}
              value={active.adjust}
              onChange={(next) => setPersonAdjust(active.id, next)}
              onClose={() => setAdjustOpen(false)}
            />
          </>
        ) : null}
      </ScrollView>
    </View>
  );
}

function EditAction({
  icon: Icon,
  label,
  onPress,
  disabled,
  selected,
}: {
  icon: PhIcon;
  label: string;
  onPress: () => void;
  disabled?: boolean;
  selected?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: !!disabled, selected: !!selected }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => ({
        flex: 1,
        minWidth: 0,
        paddingVertical: 8,
        paddingHorizontal: 4,
        borderRadius: radii.sm,
        borderCurve: 'continuous',
        backgroundColor: selected ? colors.accent : colors.accentSoft,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 4,
        opacity: disabled ? 0.45 : pressed ? 0.8 : 1,
      })}
    >
      <Icon size={18} color={selected ? '#fff' : colors.accent} weight="bold" />
      <Text
        numberOfLines={1}
        style={{
          fontSize: 11,
          lineHeight: 13,
          fontWeight: '600',
          color: selected ? '#fff' : colors.accent,
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
}
