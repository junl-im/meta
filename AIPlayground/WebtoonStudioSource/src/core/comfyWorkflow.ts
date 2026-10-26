export function basicComfyWorkflow(checkpoint:string,imageToImage=false,denoise=.55){const workflow:Record<string,{class_type:string;inputs:Record<string,unknown>}>= {
  '3':{class_type:'KSampler',inputs:{seed:1,steps:20,cfg:7,sampler_name:'euler',scheduler:'normal',denoise:1,model:['4',0],positive:['6',0],negative:['7',0],latent_image:['5',0]}},
  '4':{class_type:'CheckpointLoaderSimple',inputs:{ckpt_name:checkpoint}},
  '5':{class_type:'EmptyLatentImage',inputs:{width:512,height:768,batch_size:1}},
  '6':{class_type:'CLIPTextEncode',inputs:{text:'webtoon illustration',clip:['4',1]}},
  '7':{class_type:'CLIPTextEncode',inputs:{text:'blurry, watermark, text',clip:['4',1]}},
  '8':{class_type:'VAEDecode',inputs:{samples:['3',0],vae:['4',2]}},
  '9':{class_type:'SaveImage',inputs:{filename_prefix:'WEBTOON_STUDIO',images:['8',0]}}
};if(imageToImage){workflow['10']={class_type:'LoadImage',inputs:{image:'pending.png'}};workflow['11']={class_type:'VAEEncode',inputs:{pixels:['10',0],vae:['4',2]}};workflow['3'].inputs.latent_image=['11',0];workflow['3'].inputs.denoise=Math.min(.95,Math.max(.1,denoise))}return workflow}
