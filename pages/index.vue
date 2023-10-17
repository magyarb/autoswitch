<template>
  <v-row>
    <v-col cols="12" class="text-h4"> Status </v-col>

    <v-col cols="12" lg="4">
      <v-card>
        <v-card-title> <v-icon class="mr-2">$mdi-solar-power-variant-outline</v-icon>Production</v-card-title>
        <v-card-text>
          <p class="text-end text-h4">3,05 kW</p>
          <p class="text-end">last 24h: 18,25 kWh</p>
        </v-card-text>
      </v-card>
    </v-col>
    <v-col cols="12" lg="4">
      <v-card>
        <v-card-title><v-icon class="mr-2">$mdi-home-lightning-bolt-outline</v-icon>Consumption</v-card-title>
        <v-card-text>
          <p class="text-end text-h4">3,05 kW</p>
          <p class="text-end">last 24h: 18,25 kWh</p>
        </v-card-text>
      </v-card>
    </v-col>
    <v-col cols="12" lg="4">
      <v-card>
        <v-card-title><v-icon class="mr-2">$mdi-plus-minus-variant</v-icon>Balance</v-card-title>
        <v-card-text>
          <p class="text-end text-h4">3,05 kW</p>
          <p class="text-end">last 24h: 18,25 kWh</p>
        </v-card-text>
      </v-card>
    </v-col>

    <v-col cols="12" class="text-h4 d-flex" :style="{ alignItems: 'center' }">
      <div>Consumers</div>
      <v-spacer></v-spacer>
      <v-btn color="primary" @click="addConsumer"><v-icon>$mdi-plus</v-icon>add consumer</v-btn>
    </v-col>
    <v-col cols="12">
      <client-only>
        <v-table>
          <template #default>
            <thead>
              <tr>
                <th class="text-start">Order</th>
                <th class="text-start">Name</th>
                <th class="text-end">Status</th>
                <th class="text-end">Consumption</th>
                <th class="text-end">Mode</th>
                <th class="text-end">Edit</th>
              </tr>
            </thead>
            <draggable v-model="mainStore.consumers" tag="tbody" item-key="order" handle=".handle" @end="orderChanged">
              <template #item="{ element: lineItem }">
                <tr>
                  <td class="text-start handle">
                    <v-icon>$mdi-menu</v-icon>
                    {{ lineItem.order }}
                  </td>
                  <td>{{ lineItem.name }}</td>
                  <td class="text-end">
                    <v-chip :color="lineItem.status === 'on' ? 'success' : 'error'">
                      {{ lineItem.status.toUpperCase() }}
                    </v-chip>
                  </td>
                  <td v-if="lineItem.current_consumption" class="text-end">{{ lineItem.current_consumption }} W</td>
                  <td v-else class="text-end">-</td>
                  <td class="text-end">
                    <v-btn-toggle
                      v-model="lineItem.mode"
                      density="compact"
                      mandatory
                      :divided="true"
                      variant="outlined"
                    >
                      <v-btn value="off" color="error"> off </v-btn>
                      <v-btn value="auto" color="primary"> auto </v-btn>
                      <v-btn value="on" color="success"> on </v-btn>
                    </v-btn-toggle>
                  </td>
                  <td class="text-end" :style="{ whiteSpace: 'nowrap' }">
                    <v-btn icon flat @click="editConsumer(lineItem.name)">
                      <v-icon color="warning"> $mdi-cog </v-icon>
                    </v-btn>
                  </td>
                </tr>
              </template>
            </draggable>
          </template>
        </v-table>
      </client-only>
    </v-col>
    <v-col cols="12" class="text-h4"> Events </v-col>
    <!--v-col cols="12">
      <client-only>
        <v-table>
          <thead>
            <tr>
              <th class="text-start">Date</th>
              <th class="text-start">Event</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="e in [0, 1, 2, 3, 4, 5, 6, 7, 8, 7, 6, 5, 4, 3, 5, 6, 4]">
              <td class="text-start">date</td>
              <td class="text-start">event</td>
            </tr>
          </tbody>
        </v-table>
      </client-only>
    </v-col-->
    <ConsumerDialog
      v-model="consumerDialog"
      :consumer-name="editedConsumerName"
      @cancel-clicked="consumerDialog = false"
      @confirm-clicked="consumerDialog = false"
    />
  </v-row>
</template>

<script setup lang="ts">
import draggable from 'vuedraggable'
import ConsumerDialog from '~/components/ConsumerDialog.vue'
import { useMainStore } from '~/stores/main'
const mainStore = useMainStore()

const consumerDialog = ref(false)
const editedConsumerName = ref<undefined | string>(undefined)

function addConsumer() {
  editedConsumerName.value = undefined
  consumerDialog.value = true
}

function editConsumer(name: string) {
  editedConsumerName.value = name
  consumerDialog.value = true
}

function orderChanged() {
  console.log('order changed')
}
</script>
