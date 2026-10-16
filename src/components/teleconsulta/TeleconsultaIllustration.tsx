import { memo } from 'react';
import { StyleSheet } from 'react-native';
import Animated, { FadeInDown, ReduceMotion } from 'react-native-reanimated';
import Svg from 'react-native-svg';

import { Backdrop } from './Backdrop';
import { Doctor } from './Doctor';
import { PatientWindow } from './PatientWindow';
import { Plant } from './Plant';
import { VideoWindow } from './VideoWindow';

const VIEW_W = 1000;
const VIEW_H = 700;

const ENTERING = FadeInDown.duration(520).delay(60).withInitialValues({ transform: [{ translateY: 14 }] }).reduceMotion(
  ReduceMotion.System,
);

/** Ilustração da teleconsulta: médica em videochamada com o paciente em picture-in-picture. */
function TeleconsultaIllustrationBase() {
  return (
    <Animated.View
      entering={ENTERING}
      style={styles.frame}
      accessible
      accessibilityRole="image"
      accessibilityLabel="Ilustração de uma médica atendendo um paciente por videochamada">
      <Svg width="100%" height="100%" viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}>
        <Backdrop />
        <Plant />
        <VideoWindow>
          <Doctor />
        </VideoWindow>
        <PatientWindow />
      </Svg>
    </Animated.View>
  );
}

export const TeleconsultaIllustration = memo(TeleconsultaIllustrationBase);

const styles = StyleSheet.create({
  frame: { width: '100%', aspectRatio: VIEW_W / VIEW_H },
});
