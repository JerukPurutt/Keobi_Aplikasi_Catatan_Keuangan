import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, Modal, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useCategoryStore } from '../src/store/useCategoryStore';
import { useTheme } from '../src/hooks/useTheme';
import { Colors, BorderRadius, FontSize, Shadow } from '../src/constants/Colors';
import { hexToRgba } from '../src/utils/helpers';
import { Category } from '../src/types';
import { router } from 'expo-router';
import { useTranslation } from '../src/hooks/useTranslation';

const WALLET_COLORS = ['#1A6FE8', '#22C55E', '#EF4444', '#F5C842', '#8B5CF6', '#EC4899', '#F97316', '#14B8A6'];
const CAT_ICONS = ['briefcase', 'restaurant', 'car', 'bag', 'receipt', 'medical', 'game-controller', 'sparkles', 'fast-food', 'school', 'laptop', 'gift', 'home', 'fitness', 'pricetag'];

// ── Category Form Modal ───────────────────────────────────────────────────────
function CategoryModal({
  visible, onClose, onSave, initial, defaultType,
}: {
  visible: boolean; onClose: () => void;
  onSave: (data: Omit<Category, 'id' | 'created_at' | 'is_default'>) => void;
  initial?: Category; defaultType?: 'income' | 'expense' | 'both';
}) {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const [name, setName] = useState(initial?.name || '');
  const [icon, setIcon] = useState(initial?.icon || 'pricetag');
  const [color, setColor] = useState(initial?.color || Colors.primary);
  const [type, setType] = useState<'income' | 'expense' | 'both'>(initial?.type || 'expense');

  React.useEffect(() => {
    if (visible) {
      setName(initial?.name || '');
      setIcon(initial?.icon || 'pricetag');
      setColor(initial?.color || Colors.primary);
      setType(initial?.type || defaultType || 'expense');
    }
  }, [visible, initial, defaultType]);

  const handleSave = () => {
    if (!name.trim()) { Alert.alert('Error', t.nameCategoryRequired); return; }
    onSave({ name: name.trim(), icon, color, type });
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.modalOverlay}>
        <View style={[styles.modalSheet, { backgroundColor: colors.surface }]}>
          <View style={styles.modalHandle} />
          <Text style={[styles.modalTitle, { color: colors.text }]}>
            {initial ? t.editCategory : t.addCategory}
          </Text>

          <TextInput
            style={[styles.input, { color: colors.text, backgroundColor: colors.input, borderColor: colors.inputBorder }]}
            placeholder={t.placeholderCategoryName}
            placeholderTextColor={colors.textMuted}
            value={name}
            onChangeText={setName}
          />

          <Text style={[styles.pickerLabel, { color: colors.textSecondary }]}>{t.type}</Text>
          <View style={styles.typeRow}>
            {(['income', 'expense', 'both'] as const).map(typeOpt => (
              <TouchableOpacity
                key={typeOpt}
                style={[styles.typeBtn, { borderColor: type === typeOpt ? color : colors.border },
                  type === typeOpt && { backgroundColor: hexToRgba(color, 0.15) }]}
                onPress={() => setType(typeOpt)}
              >
                <Text style={[styles.typeText, { color: type === typeOpt ? color : colors.textMuted }]}>
                  {typeOpt === 'income' ? t.income : typeOpt === 'expense' ? t.expense : t.both}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={[styles.pickerLabel, { color: colors.textSecondary }]}>{t.icon}</Text>
          <View style={styles.iconGrid}>
            {CAT_ICONS.map(ic => (
              <TouchableOpacity
                key={ic}
                style={[styles.iconOption, { borderColor: icon === ic ? color : colors.border },
                  icon === ic && { backgroundColor: hexToRgba(color, 0.15) }]}
                onPress={() => setIcon(ic)}
              >
                <Ionicons name={ic as any} size={22} color={icon === ic ? color : colors.textMuted} />
              </TouchableOpacity>
            ))}
          </View>

          <Text style={[styles.pickerLabel, { color: colors.textSecondary }]}>{t.color}</Text>
          <View style={styles.colorRow}>
            {WALLET_COLORS.map(c => (
              <TouchableOpacity
                key={c}
                style={[styles.colorDot, { backgroundColor: c }, color === c && styles.colorDotSelected]}
                onPress={() => setColor(c)}
              />
            ))}
          </View>

          <View style={styles.modalButtons}>
            <TouchableOpacity style={[styles.cancelBtn, { borderColor: colors.border }]} onPress={onClose}>
              <Text style={[styles.cancelText, { color: colors.textSecondary }]}>{t.cancel}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.saveBtn, { backgroundColor: Colors.primary }]} onPress={handleSave}>
              <Text style={styles.saveText}>{t.save}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

// ── Category Manager Screen ──────────────────────────────────────────────────
export default function CategoryManagerScreen() {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { categories, loadCategories, addCategory, updateCategory, deleteCategory } = useCategoryStore();

  const [categoryTab, setCategoryTab] = useState<'expense' | 'income'>('expense');
  const [showCatModal, setShowCatModal] = useState(false);
  const [editingCat, setEditingCat] = useState<Category | undefined>();

  useEffect(() => {
    loadCategories();
  }, []);

  const handleDeleteCat = (cat: Category) => {
    if (cat.is_default) { Alert.alert('Info', t.defaultCategoryInfo); return; }
    Alert.alert(t.deleteCategoryTitle, t.deleteCategoryConfirm.replace('{name}', cat.name), [
      { text: t.cancel, style: 'cancel' },
      { text: t.delete, style: 'destructive', onPress: () => deleteCategory(cat.id) },
    ]);
  };

  const filteredCats = categories.filter(c => c.type === categoryTab || c.type === 'both');

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={26} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>{t.manageCategoryTitle}</Text>
      </View>

      <View style={[styles.modeToggleContainer, { backgroundColor: colors.surfaceSecondary, marginTop: 12 }]}>
        {(['expense', 'income'] as const).map(tab => {
          const isActive = categoryTab === tab;
          return (
            <TouchableOpacity
              key={tab}
              style={[
                styles.modeBtn,
                isActive && {
                  backgroundColor: colors.surface,
                  ...Shadow.sm,
                },
              ]}
              onPress={() => setCategoryTab(tab)}
              activeOpacity={0.8}
            >
              <Ionicons
                name={tab === 'income' ? 'arrow-down-circle' : 'arrow-up-circle'}
                size={18}
                color={isActive ? (tab === 'income' ? Colors.income : Colors.expense) : colors.textMuted}
              />
              <Text style={[
                styles.modeBtnText,
                { color: isActive ? colors.text : colors.textMuted },
                isActive && { fontWeight: '700' },
              ]}>
                {tab === 'income' ? t.income : t.expense}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 48 }}>
        <View style={[styles.settingsCard, { backgroundColor: colors.surface, marginTop: 16 }]}>
          {filteredCats.map((cat, idx) => (
            <View key={cat.id} style={[styles.catRow, { borderBottomColor: colors.border }, idx === filteredCats.length - 1 && { borderBottomWidth: 0 }]}>
              <View style={[styles.catRowIcon, { backgroundColor: hexToRgba(cat.color, 0.15) }]}>
                <Ionicons name={cat.icon as any} size={18} color={cat.color} />
              </View>
              <Text style={[styles.catRowName, { color: colors.text }]} numberOfLines={1}>{cat.name}</Text>
              {cat.is_default && (
                <Text style={{ fontSize: 11, color: colors.textMuted, marginRight: 8 }}>{t.defaultText}</Text>
              )}
              {!cat.is_default && (
                <>
                  <TouchableOpacity onPress={() => { setEditingCat(cat); setShowCatModal(true); }}>
                    <Ionicons name="pencil" size={16} color={colors.textMuted} />
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => handleDeleteCat(cat)} style={{ marginLeft: 12 }}>
                    <Ionicons name="trash" size={16} color={colors.textMuted} />
                  </TouchableOpacity>
                </>
              )}
            </View>
          ))}
        </View>

        <TouchableOpacity
          style={[styles.addItemBtn, { borderColor: Colors.primary, marginTop: 24 }]}
          onPress={() => { setEditingCat(undefined); setShowCatModal(true); }}
        >
          <Ionicons name="add" size={18} color={Colors.primary} />
          <Text style={[styles.addItemText, { color: Colors.primary }]}>{t.addCategory}</Text>
        </TouchableOpacity>
      </ScrollView>

      <CategoryModal
        visible={showCatModal}
        onClose={() => { setShowCatModal(false); setEditingCat(undefined); }}
        initial={editingCat}
        defaultType={categoryTab}
        onSave={data => editingCat ? updateCategory(editingCat.id, data) : addCategory(data)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  backBtn: {
    paddingRight: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: { fontSize: FontSize.xxl, fontWeight: '800', flex: 1 },
  modeToggleContainer: {
    flexDirection: 'row', marginHorizontal: 20, borderRadius: BorderRadius.md, padding: 4,
  },
  modeBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, paddingVertical: 12, borderRadius: BorderRadius.md,
  },
  modeBtnText: { fontSize: FontSize.md },
  settingsCard: { marginHorizontal: 20, borderRadius: BorderRadius.lg, overflow: 'hidden', marginBottom: 8 },
  catRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  catRowIcon: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  catRowName: { flex: 1, fontSize: FontSize.sm, fontWeight: '600' },
  addItemBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginHorizontal: 20,
    paddingVertical: 12,
    borderRadius: BorderRadius.md,
    borderWidth: 1.5,
    borderStyle: 'dashed',
  },
  addItemText: { fontSize: FontSize.sm, fontWeight: '700' },
  modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' },
  modalSheet: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, maxHeight: '90%' },
  modalHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: '#ccc', alignSelf: 'center', marginBottom: 16 },
  modalTitle: { fontSize: FontSize.xl, fontWeight: '700', marginBottom: 16 },
  input: {
    borderWidth: 1, borderRadius: BorderRadius.md, padding: 14,
    fontSize: FontSize.md, marginBottom: 12,
  },
  pickerLabel: { fontSize: FontSize.sm, fontWeight: '600', marginBottom: 8, marginTop: 4 },
  iconGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  iconOption: {
    width: 48, height: 48, borderRadius: BorderRadius.md,
    alignItems: 'center', justifyContent: 'center', borderWidth: 1.5,
  },
  colorRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  colorDot: { width: 32, height: 32, borderRadius: 16 },
  colorDotSelected: { borderWidth: 3, borderColor: '#fff', transform: [{ scale: 1.15 }] },
  typeRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  typeBtn: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: BorderRadius.md, borderWidth: 1.5 },
  typeText: { fontSize: 12, fontWeight: '600' },
  modalButtons: { flexDirection: 'row', gap: 12, marginTop: 4 },
  cancelBtn: { flex: 1, paddingVertical: 14, borderRadius: BorderRadius.lg, borderWidth: 1.5, alignItems: 'center' },
  cancelText: { fontSize: FontSize.md, fontWeight: '600' },
  saveBtn: { flex: 2, paddingVertical: 14, borderRadius: BorderRadius.lg, alignItems: 'center' },
  saveText: { color: '#fff', fontSize: FontSize.md, fontWeight: '700' },
});
