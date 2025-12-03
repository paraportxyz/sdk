<script setup lang="ts">
import type { Asset, Chain } from '@paraport/core'
import { getAssetDecimals } from '@paraport/core'
import { computed } from 'vue'
import { formatAmount } from '@/utils/amount'

const props = defineProps<{
  amount: number | string | bigint
  chain: Chain
  asset: string
}>()

const decimals = computed(() => getAssetDecimals(props.chain, props.asset as Asset))
const formattedAmount = computed(() => formatAmount(props.amount, decimals.value || 0, props.asset))
</script>

<template>
  <span>{{ formattedAmount }}</span>
</template>
