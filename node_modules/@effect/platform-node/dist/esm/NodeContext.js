/**
 * @since 1.0.0
 */
import * as NodeCommandExecutor from "@effect/platform-node-shared/NodeCommandExecutor";
import * as NodeFileSystem from "@effect/platform-node-shared/NodeFileSystem";
import * as NodePath from "@effect/platform-node-shared/NodePath";
import * as NodeTerminal from "@effect/platform-node-shared/NodeTerminal";
import { pipe } from "effect/Function";
import * as Layer from "effect/Layer";
import * as NodeWorker from "./NodeWorker.js";
/**
 * @since 1.0.0
 * @category layer
 */
export const layer = /*#__PURE__*/pipe(/*#__PURE__*/Layer.mergeAll(NodePath.layer, NodeCommandExecutor.layer, NodeTerminal.layer, NodeWorker.layerManager), /*#__PURE__*/Layer.provideMerge(NodeFileSystem.layer));
//# sourceMappingURL=NodeContext.js.map