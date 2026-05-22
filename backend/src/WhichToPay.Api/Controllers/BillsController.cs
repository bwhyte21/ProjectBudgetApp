using Microsoft.AspNetCore.Mvc;
using WhichToPay.Core.Domain;
using WhichToPay.Core.Dtos;
using WhichToPay.Core.Persistence;
using WhichToPay.Core.Validation;

namespace WhichToPay.Api.Controllers;

[ApiController]
[Route("api/bills")]
public sealed class BillsController : ControllerBase
{
    private readonly IBillRepository _repo;

    public BillsController(IBillRepository repo) => _repo = repo;

    [HttpGet]
    public ActionResult<IEnumerable<BillReadDto>> GetAll() =>
        Ok(_repo.GetAll().Select(BillReadDto.From));

    [HttpGet("{id:guid}")]
    public ActionResult<BillReadDto> GetById(Guid id)
    {
        var bill = _repo.GetById(id);
        return bill is null ? NotFound() : Ok(BillReadDto.From(bill));
    }

    [HttpPost]
    public ActionResult<BillReadDto> Create(BillCreateDto dto)
    {
        var (ok, reason) = InputSanitizer.Check(dto.Name);
        if (!ok) return BadRequest(new { error = reason });

        var (noteOk, noteReason) = InputSanitizer.Check(dto.Note);
        if (!noteOk) return BadRequest(new { error = noteReason });

        var bill = new Bill
        {
            Name = dto.Name.Trim(),
            MonthlyAmountOwed = dto.MonthlyAmountOwed,
            TotalBalance = dto.TotalBalance,
            DueDate = dto.DueDate,
            DueAnchorDay = dto.DueDate.Day,
            Category = dto.Category,
            MinimumPayment = dto.MinimumPayment,
            Note = NormalizeNote(dto.Note)
        };
        _repo.Add(bill);
        return CreatedAtAction(nameof(GetById), new { id = bill.Id }, BillReadDto.From(bill));
    }

    [HttpPut("{id:guid}")]
    public ActionResult<BillReadDto> Update(Guid id, BillUpdateDto dto)
    {
        var (ok, reason) = InputSanitizer.Check(dto.Name);
        if (!ok) return BadRequest(new { error = reason });

        var (noteOk, noteReason) = InputSanitizer.Check(dto.Note);
        if (!noteOk) return BadRequest(new { error = noteReason });

        var existing = _repo.GetById(id);
        if (existing is null) return NotFound();

        existing.Name = dto.Name.Trim();
        existing.MonthlyAmountOwed = dto.MonthlyAmountOwed;
        existing.TotalBalance = dto.TotalBalance;
        if (existing.DueDate != dto.DueDate)
        {
            existing.DueAnchorDay = dto.DueDate.Day;
        }
        existing.DueDate = dto.DueDate;
        existing.Category = dto.Category;
        existing.MinimumPayment = dto.MinimumPayment;
        existing.Note = NormalizeNote(dto.Note);

        _repo.Update(existing);
        return Ok(BillReadDto.From(existing));
    }

    [HttpDelete("{id:guid}")]
    public IActionResult Delete(Guid id) =>
        _repo.Delete(id) ? NoContent() : NotFound();

    [HttpPost("{id:guid}/mark-paid")]
    public ActionResult<BillReadDto> MarkPaid(Guid id, MarkPaidDto dto)
    {
        var maxAllowed = DateOnly.FromDateTime(DateTime.UtcNow).AddMonths(1);
        if (dto.PaidPeriod > maxAllowed)
            return BadRequest(new { error = "PaidPeriod is too far in the future." });

        var existing = _repo.GetById(id);
        if (existing is null) return NotFound();

        existing.LastPaidPeriod = dto.PaidPeriod;
        existing.LastPaidAt = DateTime.UtcNow;

        if (dto.BalancePayment.HasValue && existing.TotalBalance.HasValue)
        {
            existing.TotalBalance = Math.Max(0m, existing.TotalBalance.Value - dto.BalancePayment.Value);
        }

        var anchorDay = existing.DueAnchorDay ?? existing.DueDate.Day;
        existing.DueAnchorDay = anchorDay;
        existing.DueDate = AdvanceOneMonth(dto.PaidPeriod, anchorDay);

        _repo.Update(existing);
        return Ok(BillReadDto.From(existing));
    }

    private static string? NormalizeNote(string? note)
    {
        var trimmed = note?.Trim();
        return string.IsNullOrEmpty(trimmed) ? null : trimmed;
    }

    private static DateOnly AdvanceOneMonth(DateOnly paidPeriod, int anchorDay)
    {
        var next = paidPeriod.AddMonths(1);
        var daysInMonth = DateTime.DaysInMonth(next.Year, next.Month);
        return new DateOnly(next.Year, next.Month, Math.Min(anchorDay, daysInMonth));
    }
}
