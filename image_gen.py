# IMPORTS
import tkinter as tk
from tkinter import ttk, filedialog
from PIL import Image, ImageDraw, ImageTk
import os
from pathlib import Path
import io
from math import sqrt

# CONFIGURABLE CHECKERBOARD SETTINGS
CONFIG = {
    "corner_cubicle": {
        "colors": [(255, 255, 255), (0, 0, 0)],
        "size_percentage": 0.025,
    },
    "main_cubicle": {
        "colors": [(255, 0, 0), (0, 255, 0), (0, 0, 255)],
        "size": 50,
    }
}

# UTILITY FUNCTIONS
def create_stripeless_adjusted_image(target_size, img_format="PNG"):
    """
    Create a finely adjusted checkerboard image ensuring no white stripes appear 
    for very small image sizes.
    """
    # Derived from CONFIG
    corner_colors = CONFIG["corner_cubicle"]["colors"]
    main_colors = CONFIG["main_cubicle"]["colors"]

    # Initial estimate of image size
    width = height = int(sqrt(target_size))

    # Set the corner cubicle size from the CONFIG
    corner_square_size = CONFIG["corner_cubicle"]["size_percentage"] * min(width, height)
    corner_square_size = max(5, int(corner_square_size))  # Ensure it's not too small

    # The main RGB cubicles are twice the size of the corner cubicles
    square_size = 2 * corner_square_size

    # Calculate the number of squares in both dimensions for the corner area
    corner_area_squares = 8
    corner_area_size = corner_area_squares * corner_square_size

    # Ensure that the corner area doesn't occupy more than a certain fraction of the image
    # For instance, we can ensure it doesn't occupy more than 20% of the smaller dimension
    max_corner_area = 0.2 * min(width, height)
    if corner_area_size > max_corner_area:
        corner_square_size = int(max_corner_area / 8)
        square_size = 2 * corner_square_size
        corner_area_size = corner_area_squares * corner_square_size

    # Ensure corner_square_size is never zero
    corner_square_size = max(1, corner_square_size)
    square_size = 2 * corner_square_size

    # Adjust the width and height to fit a whole number of RGB squares and align with the corner area
    width = ((width - corner_area_size) // square_size * square_size) + corner_area_size
    height = ((height - corner_area_size) // square_size * square_size) + corner_area_size

    # Create the image
    img_mode = "RGB" if img_format != "PNG" else "RGBA"
    img = Image.new(img_mode, (width, height), "white")
    draw = ImageDraw.Draw(img)

    # Top-left corner for black and white cubicles
    for y in range(0, corner_area_size, corner_square_size):
        for x in range(0, corner_area_size, corner_square_size):
            color = corner_colors[(x // corner_square_size + y // corner_square_size) % len(corner_colors)]
            draw.rectangle([x, y, x+corner_square_size, y+corner_square_size], fill=color)

    # Draw the RGB cubicles for the entire image, ensuring full coverage
    for y in range(0, height, square_size):
        for x in range(0, width, square_size):
            if x < corner_area_size and y < corner_area_size:
                continue
            color = main_colors[((x) // square_size + (y) // square_size) % len(main_colors)]
            draw.rectangle([x, y, x+square_size, y+square_size], fill=color)

    return img

def adjust_image_size(img, target_size, img_format):
    """
    Iteratively adjust the image size to get as close to the target size as possible.
    """
    target_size = int(target_size)  # Ensure target_size is an integer

    padding_size = 0
    iterations = 100  # Limit the number of iterations to prevent infinite loops

    for _ in range(iterations):
        with io.BytesIO() as temp_file:
            img.save(temp_file, format=img_format)
            current_size = temp_file.tell()

            if current_size == target_size:
                return io.BytesIO(temp_file.getvalue())

            # Calculate the difference and adjust padding
            diff = target_size - current_size
            padding_size += diff

            # Limit the padding to ensure it doesn't go negative
            padding_size = max(0, padding_size)

            padding_data = b'\x00' * padding_size
            temp_file.write(padding_data)
            img_data_size = temp_file.tell()

            if img_data_size == target_size:
                return io.BytesIO(temp_file.getvalue())

            # If we reach here within this iteration, we're capturing the best effort.
            best_effort_data = temp_file.getvalue()

    # Return the best effort outside of the loop
    return io.BytesIO(best_effort_data)

# GUI FUNCTIONS
def setup_size_section(root):
    size_label = ttk.Label(root, text="Target image size:")
    size_label.grid(row=0, column=0, padx=10, pady=10, sticky=tk.W)
    size_entry = ttk.Entry(root)
    size_entry.grid(row=0, column=1, padx=10, pady=10)
    
    unit_var = tk.StringVar(value="MB")
    unit_combobox = ttk.Combobox(root, textvariable=unit_var, values=["KB", "MB", "GB"])
    unit_combobox.grid(row=0, column=2, padx=10, pady=10)
    
    return size_label, size_entry, unit_var

def setup_save_section(root):
    save_label = ttk.Label(root, text="Save directory:")
    save_label.grid(row=1, column=0, padx=10, pady=10, sticky=tk.W)

    # Get the current script directory and convert the drive letter to uppercase
    initial_dir = os.path.dirname(os.path.abspath(__file__))
    drive, path = os.path.splitdrive(initial_dir)
    corrected_initial_dir = f"{drive.upper()}{path}"
    
    save_dir = tk.StringVar(value=corrected_initial_dir)
    save_entry = ttk.Entry(root, textvariable=save_dir)
    save_entry.grid(row=1, column=1, padx=10, pady=10)
    
    browse_button = ttk.Button(root, text="Browse", command=lambda: browse_save_dir(save_dir))
    browse_button.grid(row=1, column=2, padx=10, pady=10)
    
    return save_dir

def setup_format_section(root):
    format_label = ttk.Label(root, text="Image format:")
    format_label.grid(row=2, column=0, padx=10, pady=10, sticky=tk.W)
    
    format_var = tk.StringVar(value="PNG")
    format_combobox = ttk.Combobox(root, textvariable=format_var, values=["PNG", "JPG", "TIFF"])
    format_combobox.grid(row=2, column=1, padx=10, pady=10)
    
    return format_var

def accurate_generate_image(size_entry, unit_var, save_dir, format_var):
    size_multiplier = {
        "MB": 1e6,
        "GB": 1e9,
        "KB": 1e3,
    }

    target_size = float(size_entry.get()) * size_multiplier[unit_var.get()]

    img_format = format_var.get()
    if img_format == "JPG":
        img_format = "JPEG"

    save_path = os.path.join(save_dir.get(), f"{size_entry.get()}_{unit_var.get()}_image.{img_format.lower()}")

    iterations = 10  # Limit iterations to avoid infinite loops
    for _ in range(iterations):
        img = create_stripeless_adjusted_image(target_size, img_format)
        if img.mode == "RGBA":
            img = img.convert("RGB")

        img_data = adjust_image_size(img, target_size, img_format)

        with open(save_path, "wb") as f:
            f.write(img_data.getvalue())

        # Check the actual file size
        actual_size = os.path.getsize(save_path)

        if actual_size == target_size:
            break
        else:
            # Adjust target size for the next iteration
            target_size += (target_size - actual_size)

def browse_save_dir(save_dir):
    selected_dir = filedialog.askdirectory()
    if selected_dir:
        # Convert to the standard Windows path format with backslashes
        corrected_path = os.path.normpath(selected_dir)
        # Ensure the drive letter is uppercase
        corrected_path = corrected_path[0].upper() + corrected_path[1:]
        save_dir.set(corrected_path)

class ImageGenGUI:
    def __init__(self, parent):
        self.parent = parent
        self.image_gen_tab = ttk.Frame(self.parent.notebook)
        self.parent.notebook.add(self.image_gen_tab, text="Image Generator")
        self.create_image_gen_widgets(self.image_gen_tab)

    def create_image_gen_widgets(self, container):
        # Image Generator Configuration Section
        self.image_gen_frame = ttk.LabelFrame(container, text="Image Generator Config", padding=(10, 5))
        self.image_gen_frame.grid(row=0, column=0, padx=10, pady=5, sticky=tk.W+tk.E+tk.N+tk.S)

        self.size_label, self.size_entry, self.unit_var = setup_size_section(self.image_gen_frame)
        self.save_dir = setup_save_section(self.image_gen_frame)
        self.format_var = setup_format_section(self.image_gen_frame)
        
        # Image Preview Section
        self.preview_frame = ttk.LabelFrame(container, text="Image Preview", padding=(10, 5))
        self.preview_frame.grid(row=1, column=0, padx=10, pady=5, sticky=tk.W+tk.E+tk.N+tk.S)
        self.preview_canvas = tk.Canvas(self.preview_frame, width=200, height=200, bg='gray')
        self.preview_canvas.grid(row=0, column=0, padx=10, pady=10)

        # Control Frame for Image Generator buttons within the configuration section
        self.image_gen_control_frame = ttk.Frame(self.image_gen_frame, padding=(10, 5))
        self.image_gen_control_frame.grid(row=3, column=0, columnspan=3, pady=5, sticky=tk.W+tk.E)
        self.generate_image_button = ttk.Button(self.image_gen_control_frame, text="Generate and Save Image", command=self.generate_image)
        self.generate_image_button.grid(row=0, column=0, padx=5, pady=5, sticky=tk.W+tk.E)
        self.image_gen_control_frame.grid_columnconfigure(0, weight=1)

        # Make the preview frame occupy the space below the configuration frame
        container.grid_rowconfigure(1, weight=1)
        container.grid_columnconfigure(0, weight=1)
        
        # Bind the update_image_preview method to the size_entry widget
        self.size_var = tk.StringVar()
        self.size_entry.config(textvariable=self.size_var)
        self.size_var.trace("w", self.on_size_change)  # Call on_size_change when size_entry changes

    def on_size_change(self, *args):
        size_text = self.size_var.get()
        if size_text.isdigit():  # Check if the entry text is a digit to avoid errors
            self.generate_preview()

    def generate_preview(self):
        # Get the size value from the entry
        try:
            target_size = float(self.size_entry.get()) * 1e6  # Assuming MB for simplicity
        except ValueError:
            # This is to handle the case where the entry is not a number
            return

        img_format = self.format_var.get()
        # Generate the image with the specified target size
        img = create_stripeless_adjusted_image(target_size, img_format)
        if img:
            self.update_image_preview(img)
        else:
            # Handle the case where image generation fails
            pass  # You could clear the preview or show an error message here

    def generate_image(self):
        accurate_generate_image(self.size_entry, self.unit_var, self.save_dir, self.format_var)

    def update_image_preview(self, img):
        # Resize for preview if necessary
        max_size = (200, 200)
        img.thumbnail(max_size, Image.ANTIALIAS)
        self.preview_image = ImageTk.PhotoImage(img)
        
        # Clear the canvas and update with the new image
        self.preview_canvas.delete("all")
        self.preview_canvas.create_image(
            max_size[0]//2, max_size[1]//2, image=self.preview_image
        )
        self.preview_canvas.image = self.preview_image  # Keep a reference to avoid garbage-collection