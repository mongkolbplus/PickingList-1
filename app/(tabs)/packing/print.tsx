import { Redirect, router } from 'expo-router';

import { th } from '@scan-goods/shared';

import { Screen } from '../../../src/components/Screen';

import { AppButton } from '../../../src/components/AppButton';

import { PrintView } from '../../../src/components/PrintView';

import { usePackingStore } from '../../../src/store/packingStore';



export default function PrintScreen() {

  const session = usePackingStore((s) => s.session);



  if (!session) {

    return (

      <Screen title={th.print.title}>

        <AppButton title="กลับหน้าหลัก" onPress={() => router.replace('/(tabs)')} fullWidth />

      </Screen>

    );

  }



  if (session.status !== 'confirmed') {

    return <Redirect href="/(tabs)/packing/scan" />;

  }



  return (

    <Screen title={th.print.title} subtitle={th.print.eyebrow}>

      <PrintView session={session} />

    </Screen>

  );

}

