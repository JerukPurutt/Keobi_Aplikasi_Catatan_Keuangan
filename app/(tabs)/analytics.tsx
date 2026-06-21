// Analytics screen with personal financial insights for Keobi
import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PieChart } from 'react-native-gifted-charts';
import { useTheme } from '../../src/hooks/useTheme';
import { Colors, BorderRadius, FontSize, Shadow } from '../../src/constants/Colors';
import { formatCurrency, getDateRangeForPeriod, calculatePercentageChange, hexToRgba } from '../../src/utils/helpers';
import { transactionRepository } from '../../src/db/transactionRepository';
import { CategorySummary, AnalyticsInsight } from '../../src/types';
import { useTranslation } from '../../src/hooks/useTranslation';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// ── Insight Card ─────────────────────────────────────────────────────────────
const INSIGHT_COLORS = {
  warning: { bg: '#FEF3C7', icon: Colors.accent, text: '#92400E' },
  success: { bg: '#D1FAE5', icon: Colors.income, text: '#065F46' },
  info: { bg: '#EFF6FF', icon: Colors.primary, text: '#1E40AF' },
  tip: { bg: '#F5F3FF', icon: '#8B5CF6', text: '#5B21B6' },
};

function InsightCard({ insight }: { insight: AnalyticsInsight }) {
  const { isDark } = useTheme();
  const c = INSIGHT_COLORS[insight.type];
  return (
    <View style={[styles.insightCard, { backgroundColor: isDark ? Colors.dark.surfaceSecondary : c.bg }]}>
      <Ionicons name={insight.icon as any} size={24} color={c.icon} />
      <View style={{ flex: 1 }}>
        <Text style={[styles.insightTitle, { color: isDark ? Colors.dark.text : c.text }]}>
          {insight.title}
        </Text>
        <Text style={[styles.insightDesc, { color: isDark ? Colors.dark.textSecondary : c.text + 'BB' }]}>
          {insight.description}
        </Text>
      </View>
    </View>
  );
}

// ── Category Bar ─────────────────────────────────────────────────────────────
function CategoryBar({ item, maxAmount }: { item: CategorySummary; maxAmount: number }) {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const pct = maxAmount > 0 ? (item.total / maxAmount) : 0;
  return (
    <View style={styles.catBar}>
      <View style={styles.catBarHeader}>
        <View style={[styles.catDot, { backgroundColor: item.category_color || Colors.primary }]} />
        <Text style={[styles.catBarName, { color: colors.text }]}>{item.category_name || t.others}</Text>
        <Text style={[styles.catBarPct, { color: colors.textSecondary }]}>
          {item.percentage.toFixed(1)}%
        </Text>
        <Text style={[styles.catBarAmount, { color: colors.text }]}>{formatCurrency(item.total, true)}</Text>
      </View>
      <View style={[styles.catBarTrack, { backgroundColor: colors.border }]}>
        <View style={[
          styles.catBarFill,
          { width: `${Math.min(pct * 100, 100)}%`, backgroundColor: item.category_color || Colors.primary },
        ]} />
      </View>
    </View>
  );
}

// ── Main Screen ──────────────────────────────────────────────────────────────
export default function AnalyticsScreen() {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState<'expense' | 'income'>('expense');
  const [isLoading, setIsLoading] = useState(false);
  const [categoryBreakdown, setCategoryBreakdown] = useState<CategorySummary[]>([]);
  const [currentSummary, setCurrentSummary] = useState({ income: 0, expense: 0 });
  const [prevSummary, setPrevSummary] = useState({ income: 0, expense: 0 });
  const [insights, setInsights] = useState<AnalyticsInsight[]>([]);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const current = getDateRangeForPeriod('monthly', 0);
      const previous = getDateRangeForPeriod('monthly', 1);

      const [curSummary, prevSum, breakdown] = await Promise.all([
        transactionRepository.getSummaryForPeriod(current.start, current.end),
        transactionRepository.getSummaryForPeriod(previous.start, previous.end),
        transactionRepository.getCategoryBreakdown(current.start, current.end, activeTab),
      ]);

      setCurrentSummary(curSummary);
      setPrevSummary(prevSum);
      setCategoryBreakdown(breakdown);

      // Generate insights
      const generatedInsights: AnalyticsInsight[] = [];

      const expenseChange = calculatePercentageChange(curSummary.expense, prevSum.expense);
      const incomeChange = calculatePercentageChange(curSummary.income, prevSum.income);
      const savingsRate = curSummary.income > 0
        ? ((curSummary.income - curSummary.expense) / curSummary.income) * 100
        : 0;

      if (expenseChange > 20) {
        generatedInsights.push({
          type: 'warning',
          title: t.expenseUpTitle.replace('{percent}', expenseChange.toFixed(0)),
          description: t.expenseUpDesc.replace('{amount}', formatCurrency(curSummary.expense - prevSum.expense, true)),
          icon: 'trending-up',
        });
      } else if (expenseChange < -10) {
        generatedInsights.push({
          type: 'success',
          title: t.expenseDownTitle.replace('{percent}', Math.abs(expenseChange).toFixed(0)),
          description: t.expenseDownDesc.replace('{amount}', formatCurrency(prevSum.expense - curSummary.expense, true)),
          icon: 'trending-down',
        });
      }

      if (savingsRate > 30) {
        generatedInsights.push({
          type: 'success',
          title: t.savingsRateGoodTitle.replace('{percent}', savingsRate.toFixed(0)),
          description: t.savingsRateGoodDesc,
          icon: 'save',
        });
      } else if (savingsRate < 10 && curSummary.income > 0) {
        generatedInsights.push({
          type: 'tip',
          title: t.savingsRateLowTitle,
          description: t.savingsRateLowDesc.replace('{percent}', savingsRate.toFixed(0)),
          icon: 'bulb',
        });
      }

      if (incomeChange > 10) {
        generatedInsights.push({
          type: 'success',
          title: t.incomeUpTitle.replace('{percent}', incomeChange.toFixed(0)),
          description: t.incomeUpDesc.replace('{amount}', formatCurrency(curSummary.income - prevSum.income, true)),
          icon: 'cash',
        });
      }

      if (breakdown.length > 0) {
        const topCat = breakdown[0];
        generatedInsights.push({
          type: 'info',
          title: t.topCategoryTitle.replace('{category}', topCat.category_name || t.others),
          description: t.topCategoryDesc
            .replace('{percent}', topCat.percentage.toFixed(1))
            .replace('{type}', activeTab === 'expense' ? (t.profile === 'Profil' ? 'pengeluaran' : 'expenses') : (t.profile === 'Profil' ? 'pemasukan' : 'income'))
            .replace('{amount}', formatCurrency(topCat.total, true)),
          icon: 'pie-chart',
        });
      }

      if (curSummary.expense > curSummary.income && curSummary.income > 0) {
        generatedInsights.push({
          type: 'warning',
          title: t.deficitTitle,
          description: t.deficitDesc.replace('{amount}', formatCurrency(curSummary.expense - curSummary.income, true)),
          icon: 'alert-circle',
        });
      }

      if (generatedInsights.length === 0) {
        generatedInsights.push({
          type: 'info',
          title: t.noTxnTitle,
          description: t.noTxnDesc,
          icon: 'information-circle',
        });
      }

      setInsights(generatedInsights);
    } catch (e) {
      console.error('Analytics error:', e);
    } finally {
      setIsLoading(false);
    }
  }, [activeTab]);

  useEffect(() => { loadData(); }, [loadData]);

  // Pie chart data
  const pieData = categoryBreakdown.slice(0, 6).map(c => ({
    value: c.total,
    color: c.category_color || Colors.primary,
    text: `${c.percentage.toFixed(0)}%`,
    label: c.category_name || t.others,
  }));

  const maxAmount = categoryBreakdown[0]?.total || 1;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <Text style={[styles.headerTitle, { color: colors.text }]}>{t.analyticsTitle}</Text>
      </View>

      {/* Tab */}
      <View style={[styles.tab, { backgroundColor: colors.surfaceSecondary }]}>
        {(['expense', 'income'] as const).map(tabType => (
          <TouchableOpacity
            key={tabType}
            style={[styles.tabBtn, activeTab === tabType && {
              backgroundColor: tabType === 'expense' ? Colors.expense : Colors.income,
            }]}
            onPress={() => setActiveTab(tabType)}
          >
            <Text style={[styles.tabText, { color: activeTab === tabType ? '#fff' : colors.textMuted }]}>
              {tabType === 'expense' ? t.expense : t.income}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {isLoading ? (
        <View style={styles.loading}>
          <ActivityIndicator color={Colors.primary} size="large" />
        </View>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
          {/* Pie Chart */}
          {pieData.length > 0 && (
            <View style={[styles.pieCard, { backgroundColor: colors.surface }]}>
              <Text style={[styles.cardTitle, { color: colors.text }]}>{t.categoryDistribution}</Text>
              <View style={styles.pieContainer}>
                <PieChart
                  data={pieData}
                  donut
                  radius={90}
                  innerRadius={55}
                  centerLabelComponent={() => (
                    <View style={{ alignItems: 'center' }}>
                      <Text style={{ color: colors.textMuted, fontSize: 11 }}>Total</Text>
                      <Text style={{ color: colors.text, fontSize: 14, fontWeight: '700' }}>
                        {formatCurrency(
                          activeTab === 'expense' ? currentSummary.expense : currentSummary.income,
                          true
                        )}
                      </Text>
                    </View>
                  )}
                  isAnimated
                  animationDuration={800}
                  strokeColor={colors.background}
                  strokeWidth={2}
                />
                <View style={styles.pieLegend}>
                  {pieData.map((item, i) => (
                    <View key={i} style={styles.pieLegendItem}>
                      <View style={[styles.pieDot, { backgroundColor: item.color }]} />
                      <Text style={[styles.pieLegendText, { color: colors.textSecondary }]} numberOfLines={1}>
                        {item.label}
                      </Text>
                      <Text style={[styles.pieLegendPct, { color: colors.text }]}>{item.text}</Text>
                    </View>
                  ))}
                </View>
              </View>
            </View>
          )}

          {/* Category Breakdown */}
          <View style={[styles.breakdownCard, { backgroundColor: colors.surface }]}>
            <Text style={[styles.cardTitle, { color: colors.text }]}>{t.categoryDetails}</Text>
            {categoryBreakdown.length === 0 ? (
              <View style={styles.emptyBreakdown}>
                <Ionicons name="pie-chart-outline" size={40} color={colors.textMuted} />
                <Text style={[{ color: colors.textMuted, marginTop: 8 }]}>{t.noData}</Text>
              </View>
            ) : (
              categoryBreakdown.map(item => (
                <CategoryBar key={item.category_id} item={item} maxAmount={maxAmount} />
              ))
            )}
          </View>

          {/* Insights */}
          <View style={styles.insightsSection}>
            <Text style={[styles.cardTitle, { color: colors.text, marginBottom: 12 }]}>
              {t.personalInsight}
            </Text>
            {insights.map((insight, i) => (
              <InsightCard key={i} insight={insight} />
            ))}
          </View>
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 20, paddingBottom: 12 },
  headerTitle: { fontSize: FontSize.xxl, fontWeight: '800' },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  tab: {
    flexDirection: 'row', marginHorizontal: 20, borderRadius: BorderRadius.lg,
    padding: 4, marginBottom: 16,
  },
  tabBtn: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: BorderRadius.md },
  tabText: { fontSize: FontSize.sm, fontWeight: '600' },
  pieCard: { marginHorizontal: 20, borderRadius: BorderRadius.lg, padding: 16, marginBottom: 16 },
  cardTitle: { fontSize: FontSize.lg, fontWeight: '700', marginBottom: 16 },
  pieContainer: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  pieLegend: { flex: 1, gap: 8 },
  pieLegendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  pieDot: { width: 8, height: 8, borderRadius: 4 },
  pieLegendText: { flex: 1, fontSize: 12 },
  pieLegendPct: { fontSize: 12, fontWeight: '700' },
  breakdownCard: { marginHorizontal: 20, borderRadius: BorderRadius.lg, padding: 16, marginBottom: 16, gap: 12 },
  catBar: { gap: 6 },
  catBarHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  catDot: { width: 10, height: 10, borderRadius: 5 },
  catBarName: { flex: 1, fontSize: FontSize.sm, fontWeight: '600' },
  catBarPct: { fontSize: 12 },
  catBarAmount: { fontSize: FontSize.sm, fontWeight: '700' },
  catBarTrack: { height: 6, borderRadius: 3, overflow: 'hidden' },
  catBarFill: { height: '100%', borderRadius: 3 },
  insightsSection: { paddingHorizontal: 20, gap: 10 },
  insightCard: {
    flexDirection: 'row', alignItems: 'flex-start',
    padding: 14, borderRadius: BorderRadius.lg, gap: 12,
  },
  insightTitle: { fontSize: FontSize.sm, fontWeight: '700', marginBottom: 4 },
  insightDesc: { fontSize: 12, lineHeight: 18 },
  emptyBreakdown: { alignItems: 'center', paddingVertical: 32 },
});
