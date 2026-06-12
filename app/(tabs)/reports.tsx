// Reports screen with charts for Keobi
import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BarChart, LineChart } from 'react-native-gifted-charts';
import { useTheme } from '../../src/hooks/useTheme';
import { Colors, BorderRadius, FontSize, Shadow } from '../../src/constants/Colors';
import { formatCurrency, getDateRangeForPeriod, formatDateShort, hexToRgba } from '../../src/utils/helpers';
import { transactionRepository } from '../../src/db/transactionRepository';
import { eachDayOfInterval, eachWeekOfInterval, startOfWeek, format, startOfMonth, addDays, addWeeks } from 'date-fns';
import { id } from 'date-fns/locale';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
type Period = 'daily' | 'weekly' | 'monthly';

function SummaryCard({ label, amount, icon, color }: {
  label: string; amount: number; icon: any; color: string;
}) {
  const { colors } = useTheme();
  return (
    <View style={[styles.summaryCard, { backgroundColor: colors.surface }]}>
      <View style={[styles.summaryIcon, { backgroundColor: hexToRgba(color, 0.15) }]}>
        <Ionicons name={icon} size={20} color={color} />
      </View>
      <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>{label}</Text>
      <Text style={[styles.summaryAmount, { color }]}>{formatCurrency(amount, true)}</Text>
    </View>
  );
}

export default function ReportsScreen() {
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const [period, setPeriod] = useState<Period>('monthly');
  const [offset, setOffset] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [barData, setBarData] = useState<any[]>([]);
  const [summary, setSummary] = useState({ income: 0, expense: 0 });
  const [dateRange, setDateRange] = useState({ start: 0, end: 0, label: '' });

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const range = getDateRangeForPeriod(period, offset);
      setDateRange(range);

      const dailySummaries = await transactionRepository.getDailySummaries(range.start, range.end);
      const periodSummary = await transactionRepository.getSummaryForPeriod(range.start, range.end);
      setSummary(periodSummary);

      // Build chart data points
      let chartPoints: any[] = [];

      if (period === 'daily') {
        // Hourly for today (simplified: use raw data)
        chartPoints = dailySummaries.flatMap((d: any) => ([
          { label: 'Pmskkn', value: d.income, frontColor: Colors.income, spacing: 4, barWidth: 18, topLabelComponent: () => null },
          { label: 'Pglrn', value: d.expense, frontColor: Colors.expense, barWidth: 18 },
        ]));
        if (chartPoints.length === 0) {
          chartPoints = [
            { label: 'Pemasukan', value: 0, frontColor: Colors.income, spacing: 4, barWidth: 24 },
            { label: 'Pengeluaran', value: 0, frontColor: Colors.expense, barWidth: 24 },
          ];
        }
      } else {
        // Group by day or week
        const allDays = eachDayOfInterval({ start: new Date(range.start), end: new Date(range.end) });
        const summaryMap: Record<string, { income: number; expense: number }> = {};
        for (const d of dailySummaries as any[]) {
          summaryMap[d.date_label] = { income: d.income, expense: d.expense };
        }

        if (period === 'monthly') {
          // Show each day in month
          chartPoints = allDays.flatMap(day => {
            const key = format(day, 'yyyy-MM-dd');
            const data = summaryMap[key] || { income: 0, expense: 0 };
            const dayLabel = format(day, 'd', { locale: id });
            return [
              { label: dayLabel, value: data.income, frontColor: Colors.income, spacing: 2, barWidth: 6, capColor: Colors.income },
              { value: data.expense, frontColor: Colors.expense, barWidth: 6, capColor: Colors.expense },
            ];
          }).slice(0, 62); // 31 days × 2
        } else {
          // Weekly: show each day of the week
          chartPoints = allDays.flatMap(day => {
            const key = format(day, 'yyyy-MM-dd');
            const data = summaryMap[key] || { income: 0, expense: 0 };
            const dayLabel = format(day, 'EEE', { locale: id });
            return [
              { label: dayLabel, value: data.income, frontColor: Colors.income, spacing: 4, barWidth: 16 },
              { value: data.expense, frontColor: Colors.expense, barWidth: 16 },
            ];
          });
        }
      }

      setBarData(chartPoints);
    } catch (e) {
      console.error('Report load error:', e);
    } finally {
      setIsLoading(false);
    }
  }, [period, offset]);

  useEffect(() => { loadData(); }, [loadData]);

  const chartWidth = SCREEN_WIDTH - 40;
  const textColor = colors.text;
  const gridColor = colors.border;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Laporan</Text>
      </View>

      {/* Period Toggle */}
      <View style={[styles.periodToggle, { backgroundColor: colors.surfaceSecondary }]}>
        {(['daily', 'weekly', 'monthly'] as Period[]).map(p => (
          <TouchableOpacity
            key={p}
            style={[styles.periodBtn, period === p && { backgroundColor: Colors.primary }]}
            onPress={() => { setPeriod(p); setOffset(0); }}
          >
            <Text style={[styles.periodText, { color: period === p ? '#fff' : colors.textSecondary }]}>
              {p === 'daily' ? 'Harian' : p === 'weekly' ? 'Mingguan' : 'Bulanan'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
        {/* Date Navigator */}
        <View style={styles.dateNav}>
          <TouchableOpacity
            style={[styles.navBtn, { backgroundColor: colors.surface }]}
            onPress={() => setOffset(o => o + 1)}
          >
            <Ionicons name="chevron-back" size={20} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.dateLabel, { color: colors.text }]}>{dateRange.label}</Text>
          <TouchableOpacity
            style={[styles.navBtn, { backgroundColor: colors.surface, opacity: offset === 0 ? 0.4 : 1 }]}
            onPress={() => offset > 0 && setOffset(o => o - 1)}
            disabled={offset === 0}
          >
            <Ionicons name="chevron-forward" size={20} color={colors.text} />
          </TouchableOpacity>
        </View>

        {/* Summary Cards */}
        <View style={styles.summaryRow}>
          <SummaryCard label="Pemasukan" amount={summary.income} icon="arrow-down-circle" color={Colors.income} />
          <SummaryCard label="Pengeluaran" amount={summary.expense} icon="arrow-up-circle" color={Colors.expense} />
          <SummaryCard
            label="Selisih"
            amount={summary.income - summary.expense}
            icon="analytics"
            color={summary.income >= summary.expense ? Colors.income : Colors.expense}
          />
        </View>

        {/* Chart */}
        <View style={[styles.chartCard, { backgroundColor: colors.surface }]}>
          <View style={styles.chartLegend}>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: Colors.income }]} />
              <Text style={[styles.legendText, { color: colors.textSecondary }]}>Pemasukan</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: Colors.expense }]} />
              <Text style={[styles.legendText, { color: colors.textSecondary }]}>Pengeluaran</Text>
            </View>
          </View>

          {isLoading ? (
            <View style={styles.chartLoading}>
              <ActivityIndicator color={Colors.primary} />
            </View>
          ) : barData.length === 0 ? (
            <View style={styles.chartEmpty}>
              <Ionicons name="bar-chart-outline" size={48} color={colors.textMuted} />
              <Text style={[{ color: colors.textMuted, marginTop: 8 }]}>Belum ada data</Text>
            </View>
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <BarChart
                data={barData}
                width={Math.max(chartWidth - 40, barData.length * 14)}
                height={200}
                barBorderRadius={3}
                noOfSections={4}
                yAxisTextStyle={{ color: colors.textMuted, fontSize: 10 }}
                xAxisLabelTextStyle={{ color: colors.textMuted, fontSize: 9 }}
                rulesColor={gridColor}
                yAxisColor={gridColor}
                xAxisColor={gridColor}
                isAnimated
                animationDuration={600}
                disableScroll
                showGradient
                gradientColor={isDark ? Colors.dark.surface : Colors.light.surface}
              />
            </ScrollView>
          )}
        </View>

        {/* Net Summary */}
        <View style={[styles.netCard, { backgroundColor: colors.surface }]}>
          <Text style={[styles.netLabel, { color: colors.textSecondary }]}>
            Kondisi Keuangan {dateRange.label}
          </Text>
          <Text style={[
            styles.netAmount,
            { color: summary.income >= summary.expense ? Colors.income : Colors.expense },
          ]}>
            {summary.income >= summary.expense ? '📈 Surplus ' : '📉 Defisit '}
            {formatCurrency(Math.abs(summary.income - summary.expense))}
          </Text>
          <Text style={[styles.netSubtitle, { color: colors.textMuted }]}>
            {summary.income >= summary.expense
              ? 'Keuangan kamu sehat! Pemasukan melebihi pengeluaran.'
              : 'Hati-hati! Pengeluaran melebihi pemasukan bulan ini.'}
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 20, paddingBottom: 12 },
  headerTitle: { fontSize: FontSize.xxl, fontWeight: '800' },
  periodToggle: {
    flexDirection: 'row', marginHorizontal: 20, borderRadius: BorderRadius.lg,
    padding: 4, marginBottom: 16,
  },
  periodBtn: {
    flex: 1, paddingVertical: 10, alignItems: 'center',
    borderRadius: BorderRadius.md,
  },
  periodText: { fontSize: FontSize.sm, fontWeight: '600' },
  dateNav: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, marginBottom: 16,
  },
  navBtn: {
    width: 36, height: 36, borderRadius: 18,
    alignItems: 'center', justifyContent: 'center',
  },
  dateLabel: { fontSize: FontSize.lg, fontWeight: '700' },
  summaryRow: { flexDirection: 'row', paddingHorizontal: 20, gap: 10, marginBottom: 16 },
  summaryCard: {
    flex: 1, borderRadius: BorderRadius.lg, padding: 12, alignItems: 'center', gap: 4,
  },
  summaryIcon: {
    width: 36, height: 36, borderRadius: 18,
    alignItems: 'center', justifyContent: 'center', marginBottom: 4,
  },
  summaryLabel: { fontSize: 11, fontWeight: '500', textAlign: 'center' },
  summaryAmount: { fontSize: FontSize.sm, fontWeight: '700', textAlign: 'center' },
  chartCard: {
    marginHorizontal: 20, borderRadius: BorderRadius.lg,
    padding: 16, marginBottom: 16,
  },
  chartLegend: { flexDirection: 'row', gap: 16, marginBottom: 16 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  legendText: { fontSize: FontSize.sm },
  chartLoading: { height: 200, alignItems: 'center', justifyContent: 'center' },
  chartEmpty: { height: 200, alignItems: 'center', justifyContent: 'center' },
  netCard: {
    marginHorizontal: 20, borderRadius: BorderRadius.lg, padding: 20, gap: 8,
  },
  netLabel: { fontSize: FontSize.sm },
  netAmount: { fontSize: FontSize.xxl, fontWeight: '800' },
  netSubtitle: { fontSize: FontSize.sm, lineHeight: 20 },
});
