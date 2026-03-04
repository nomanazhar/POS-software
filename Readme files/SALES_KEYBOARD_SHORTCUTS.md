# Sales Keyboard Shortcuts

## Overview
The sales screen features an optimized and flexible keyboard shortcut system that allows for efficient point-of-sale operations. All shortcuts are context-aware and provide immediate feedback.

## Primary Shortcuts

### Scanner & Cart Operations
- **Ctrl+B** - Activate barcode scanner
  - Focuses the scanner input field
  - Selects all text for easy replacement
  - Shows "Barcode scanner activated" toast

- **Ctrl+H** - Create new bill
  - Creates a new bill in the cart section
  - Automatically focuses back to scanner
  - Shows "New bill created - scanner ready" toast

- **Ctrl+N** - Quick new bill (alternative)
  - Same as Ctrl+H but with different key combination
  - Useful for users who prefer N for "New"

### Checkout Field Navigation
- **Ctrl+D** - Jump to discount field
  - Focuses the discount input in checkout
  - Selects existing text for easy editing
  - Shows "Discount field activated" toast

- **Ctrl+E** - Jump to extra charges field
  - Focuses the extra charges input
  - Shows "Extra charges input activated" toast

- **Ctrl+R** - Jump to received cash field
  - Focuses the received cash input
  - Shows "Received cash input activated" toast

- **Ctrl+F2** - Add customer information
  - Focuses the customer name input field
  - Shows "Customer information input activated" toast

### Quantity & Pricing
- **Ctrl+Q** - Enter quantity
  - Focuses quantity input field
  - Shows "Quantity input activated" toast

- **Ctrl+W** - Toggle wholesale mode
  - Switches between retail and wholesale pricing
  - Shows current mode in toast

### Bill Management
- **Ctrl+V** - Discard current bill
  - Clears the current cart
  - Focuses back to scanner
  - Shows "Bill discarded - scanner ready" toast

- **Ctrl+Enter** - Quick complete sale
  - Completes the current sale
  - Shows success/error message
  - Focuses back to scanner on success

- **Ctrl+Shift+P** - Complete sale (alternative)
  - Same as Ctrl+Enter but with different key combination

### Advanced Navigation
- **Ctrl+Tab** - Cycle through input fields
  - Cycles through: Scanner → Discount → Extra Charges → Received Cash → Customer Name
  - Automatically selects text in input fields
  - Shows which field is activated

### System Operations
- **Ctrl+Shift+R** - Reload screen
  - Refreshes the entire sales screen
  - Shows "Screen reloaded" toast

## Context-Aware Features

### Smart Focus Management
- All shortcuts that focus input fields automatically select existing text
- After completing actions (new bill, discard, complete sale), focus returns to scanner
- Toast notifications provide immediate feedback

### Error Handling
- If a target field is not available, shows error toast
- Graceful fallbacks for missing elements
- Clear error messages for failed operations

### Input Field Cycling
The Ctrl+Tab shortcut provides intelligent field cycling:
1. Scanner (barcode input)
2. Discount field
3. Extra charges field
4. Received cash field
5. Customer name field

## Implementation Details

### Flexible Architecture
- Shortcuts are registered dynamically
- Context-aware focus management
- Automatic cleanup on component unmount
- Support for both global and local refs

### Performance Optimizations
- Debounced focus operations
- Efficient event handling
- Minimal re-renders
- Smart shortcut registration/unregistration

### User Experience
- Immediate visual feedback via toasts
- Consistent behavior across all shortcuts
- Intuitive key combinations
- Fallback options for common operations

## Usage Tips

1. **Start with Scanner**: Use Ctrl+B to activate the scanner for most operations
2. **Quick Bill Management**: Use Ctrl+H for new bills, Ctrl+V to discard
3. **Fast Checkout**: Use Ctrl+D, Ctrl+E, Ctrl+R for quick field navigation
4. **Complete Sales**: Use Ctrl+Enter for quick completion
5. **Field Cycling**: Use Ctrl+Tab to quickly move between input fields

## Technical Notes

- All shortcuts work globally when not typing in input fields
- Ctrl+Tab and Ctrl+Enter work even when focused in input fields
- Shortcuts are automatically cleaned up when components unmount
- Toast notifications provide immediate user feedback
- Focus management is optimized for sales workflow 