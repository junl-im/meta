// A tiny ONNX Add model built from first principles; no faces, training data,
// external model weights, or media files. ONNX ModelProto / IR v8, opset 13.
const encoder = new TextEncoder();

function varint(value) {
  if (!Number.isSafeInteger(value) || value < 0) throw new Error("Invalid protobuf integer");
  const result=[];
  do {const byte=value%128;value=Math.floor(value/128);result.push(value?byte|0x80:byte);} while(value);
  return result;
}
const field=(index,wire,payload)=>[...varint(index*8+wire),...payload];
const integer=(index,value)=>field(index,0,varint(value));
const message=(index,payload)=>field(index,2,[...varint(payload.length),...payload]);
const string=(index,value)=>message(index,encoder.encode(value));
const flatten=(...segments)=>segments.flat();
function valueInfo(name) {
  const dimension=message(1,integer(1,1)); // TensorShapeProto.Dimension(dim_value=1)
  const shape=message(2,dimension);           // TensorShapeProto
  const tensorType=flatten(integer(1,1),shape); // TensorProto.FLOAT=1
  const type=message(1,tensorType);           // TypeProto.tensor_type
  return flatten(string(1,name),message(2,type));
}

export function createSyntheticAddModel() {
  // NodeProto: Add(a,b) -> sum
  const node=flatten(string(1,"a"),string(1,"b"),string(2,"sum"),
    string(3,"synthetic_float_add"),string(4,"Add"));
  // GraphProto: inputs a,b; output sum. Every tensor has shape [1].
  const graph=flatten(message(1,node),string(2,"actor_swap_synthetic_add"),
    message(11,valueInfo("a")),message(11,valueInfo("b")),
    message(12,valueInfo("sum")));
  // OperatorSetIdProto: default domain, version 13
  const opset=integer(2,13);
  const model=flatten(integer(1,8),string(2,"actor-swap-studio"),
    message(7,graph),message(8,opset));
  return Uint8Array.from(model);
}

export const SYNTHETIC_FEEDS=Object.freeze({a:2,b:3,expected:5});
