import os
import sys
import json
from pathlib import Path

# Add project roots to path dynamically
BACKEND_ROOT = Path(__file__).resolve().parent
PROJECT_ROOT = BACKEND_ROOT.parent
VIDEO_WORKFLOW_DIR = BACKEND_ROOT / "workflows" / "video_workflow"

if str(PROJECT_ROOT) not in sys.path:
    sys.path.append(str(PROJECT_ROOT))
if str(BACKEND_ROOT) not in sys.path:
    sys.path.append(str(BACKEND_ROOT))
if str(VIDEO_WORKFLOW_DIR) not in sys.path:
    sys.path.insert(0, str(VIDEO_WORKFLOW_DIR))

# Mock components before importing video_chain
import agent_backend.workflows.video_workflow.script_gen as script_gen
import agent_backend.workflows.video_workflow.image_gen as image_gen
import agent_backend.workflows.video_workflow.video_gen as video_gen
import openai

# Store the original openai Completions.create before step runs
original_openai_create = openai.resources.chat.completions.Completions.create

captured_script_config = {}
captured_image_config = {}
captured_video_config = {}

# Mock generate_shot_script
def mock_generate_shot_script(input_text, shot_duration=5, max_retries=3, style="", output_path=None):
    # Capture values
    captured_script_config["MODEL_API_KEY"] = script_gen.MODEL_API_KEY
    captured_script_config["MODEL_BASE_URL"] = script_gen.MODEL_BASE_URL
    captured_script_config["SCRIPT_MODEL"] = script_gen.SCRIPT_MODEL
    captured_script_config["is_create_patched"] = (openai.resources.chat.completions.Completions.create != original_openai_create)
    return [{"shot_number": 1, "content": "测试", "image_description": "描述", "camera_movement": "运镜", "style_setting": "风格"}]

script_gen.generate_shot_script = mock_generate_shot_script

# Mock generate_images
def mock_generate_images(*args, **kwargs):
    captured_image_config["MODEL_API_KEY"] = image_gen.MODEL_API_KEY
    captured_image_config["MODEL_BASE_URL"] = image_gen.MODEL_BASE_URL
    captured_image_config["IMAGE_MODEL"] = image_gen.IMAGE_MODEL
    captured_image_config["steps"] = kwargs.get("steps")
    return True

image_gen.generate_images = mock_generate_images

# Mock generate_videos
def mock_generate_videos(*args, **kwargs):
    captured_video_config["VIDEO_PROVIDER"] = video_gen.VIDEO_PROVIDER
    captured_video_config["VIDEO_API_KEY"] = video_gen.VIDEO_API_KEY
    captured_video_config["VIDEO_BASE_URL"] = video_gen.VIDEO_BASE_URL
    captured_video_config["VIDEO_MODEL"] = video_gen.VIDEO_MODEL
    return True

video_gen.generate_videos = mock_generate_videos

# Now import video_chain
from agent_backend.workflows.video_workflow.video_chain import run_workflow_step1, run_workflow_step2, run_workflow_step3

def test_dynamic_configs():
    session_id = "test_session_dynamic_123"
    
    mock_video_configs = {
        "script": {
            "api_key": "custom_script_key",
            "api_base": "https://custom.script.api/v1",
            "model_name": "custom-script-model",
            "temperature": 0.85
        },
        "image": {
            "api_key": "custom_image_key",
            "api_base": "https://custom.image.api/v1",
            "model_name": "custom-image-model",
            "steps": 45
        },
        "video": {
            "provider": "huoshan",
            "api_key": "custom_video_key",
            "api_base": "https://custom.video.api/v1",
            "model_name": "custom-video-model"
        }
    }
    
    context = {
        "video_configs": mock_video_configs
    }
    
    # 1. Run Step 1
    print("--- Running Step 1 ---")
    res1 = run_workflow_step1("video_workflow", "测试提示词", session_id, context)
    print(f"Step 1 finished: {res1.get('success')}")
    assert res1.get("success") is True, f"Step 1 failed: {res1.get('error')}"
    
    # Assert Step 1 injected values correct
    print("Verifying Step 1 injected values...")
    assert captured_script_config.get("MODEL_API_KEY") == "custom_script_key"
    assert captured_script_config.get("MODEL_BASE_URL") == "https://custom.script.api/v1"
    assert captured_script_config.get("SCRIPT_MODEL") == "custom-script-model"
    assert captured_script_config.get("is_create_patched") is True
    # Verify that original values were restored after Step 1 execution finishes
    assert script_gen.MODEL_API_KEY != "custom_script_key"
    assert openai.resources.chat.completions.Completions.create == original_openai_create
    print("✅ Step 1 injection verified and original values correctly restored!")

    # 2. Run Step 2
    print("\n--- Running Step 2 ---")
    gen2 = run_workflow_step2(session_id)
    events2 = list(gen2)
    print(f"Step 2 completed, generated {len(events2)} events")
    
    # Assert Step 2 injected values correct
    print("Verifying Step 2 injected values...")
    assert captured_image_config.get("MODEL_API_KEY") == "custom_image_key"
    assert captured_image_config.get("MODEL_BASE_URL") == "https://custom.image.api/v1"
    assert captured_image_config.get("IMAGE_MODEL") == "custom-image-model"
    assert captured_image_config.get("steps") == 45
    # Verify that original values were restored after Step 2 execution finishes
    assert image_gen.MODEL_API_KEY != "custom_image_key"
    print("✅ Step 2 injection verified and original values correctly restored!")

    # 3. Run Step 3
    print("\n--- Running Step 3 ---")
    gen3 = run_workflow_step3(session_id)
    events3 = list(gen3)
    print(f"Step 3 completed, generated {len(events3)} events")
    
    # Assert Step 3 injected values correct
    print("Verifying Step 3 injected values...")
    assert captured_video_config.get("VIDEO_PROVIDER") == "huoshan"
    assert captured_video_config.get("VIDEO_API_KEY") == "custom_video_key"
    assert captured_video_config.get("VIDEO_BASE_URL") == "https://custom.video.api/v1"
    assert captured_video_config.get("VIDEO_MODEL") == "custom-video-model"
    # Verify that original values were restored after Step 3 execution finishes
    assert video_gen.VIDEO_API_KEY != "custom_video_key"
    print("✅ Step 3 injection verified and original values correctly restored!")

if __name__ == "__main__":
    try:
        test_dynamic_configs()
        print("\n🎉 ALL INJECTION TESTS PASSED SUCCESSFULLY! 🎉")
    except Exception as e:
        print(f"\n❌ TEST FAILED: {str(e)}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
