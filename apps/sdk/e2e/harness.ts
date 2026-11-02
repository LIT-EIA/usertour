// Test entry: exposes the focus manager to the fixture pages
import { StepFocusManager } from '../src/core/step-focus-manager';
import { getTargetIntro } from '../src/core/target-intro';
import { getStepLabel, getTourStrings } from '../src/core/translations';

(window as Window & { UsertourFocusTest?: unknown }).UsertourFocusTest = {
  StepFocusManager,
  getTourStrings,
  getStepLabel,
  getTargetIntro,
};
