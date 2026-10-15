// `@iobroker/type-detector` is CommonJS, so the bundler cannot tree-shake it: importing `Types` from its index
// brings the whole detector along (patterns, ChannelDetector - 117 KB) into the runtime bundle, where the device
// widgets only need the names of the types. The enum alone lives in `build/types`, which requires nothing.
export { Types } from '@iobroker/type-detector/build/types';
